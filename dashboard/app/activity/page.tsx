'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAccount, usePublicClient } from 'wagmi';
import { formatUnits, parseAbiItem } from 'viem';
import { Header } from '@/components/Header';
import { TxLink, AddressLink } from '@/components/TxLink';
import {
  ADDRESSES,
  tipJarFullAbi,
  subscriptionsFullAbi,
  contentPaywallFullAbi,
  payPerCallFullAbi,
  registryAbi,
} from '@/lib/config';

interface Activity {
  kind: 'tip' | 'subscribe' | 'content' | 'api';
  blockNumber: bigint;
  txHash: string;
  timestamp: number;
  // tip
  tipId?: bigint;
  usernameHash?: string;
  amount?: bigint;
  message?: string;
  // subscribe
  subId?: bigint;
  planId?: bigint;
  months?: bigint;
  planName?: string;
  planCreatorHash?: string;
  // content
  contentId?: string;
  contentTitle?: string;
  contentCreatorHash?: string;
  // api
  callId?: bigint;
  endpointId?: string;
  endpointName?: string;
  endpointCreatorHash?: string;
}

const TipSentEvent = parseAbiItem(
  'event TipSent(uint256 indexed tipId, bytes32 indexed usernameHash, address indexed from, uint256 netAmount, uint256 protocolFee, string message)'
);
const SubscribedEvent = parseAbiItem(
  'event Subscribed(uint256 indexed subId, uint256 indexed planId, address indexed subscriber, uint256 months, uint256 amount)'
);
const AccessPurchasedEvent = parseAbiItem(
  'event AccessPurchased(bytes32 indexed contentId, address indexed buyer, uint256 amount)'
);
const PaidEvent = parseAbiItem(
  'event Paid(uint256 indexed callId, bytes32 indexed endpointId, address indexed payer, uint256 amount)'
);

export default function ActivityPage() {
  const { address, isConnected } = useAccount();
  const pub = usePublicClient();
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [usernameMap, setUsernameMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!pub || !address) return;
    const client = pub;
    const load = async () => {
      setLoading(true);
      try {
        // Arc RPC limits eth_getLogs to 10k blocks. Deploy was recent so scan last ~150k in chunks.
        const latestBlock = await client.getBlockNumber();
        const TOTAL_WINDOW = 150_000n; // ~1 day at sub-second blocks
        const CHUNK = 10_000n;
        const startBlock = latestBlock > TOTAL_WINDOW ? latestBlock - TOTAL_WINDOW : 0n;

        // Build chunk ranges
        const chunks: Array<[bigint, bigint]> = [];
        for (let from = startBlock; from <= latestBlock; from += CHUNK + 1n) {
          const to = from + CHUNK > latestBlock ? latestBlock : from + CHUNK;
          chunks.push([from, to]);
        }

        async function getAllLogs(opts: { address: string; event: any; argKey: string }) {
          const out: any[] = [];
          const results = await Promise.all(chunks.map(async ([from, to]) => {
            try {
              return await client.getLogs({
                address: opts.address as `0x${string}`,
                event: opts.event,
                args: { [opts.argKey]: address },
                fromBlock: from, toBlock: to,
              });
            } catch {
              return [];
            }
          }));
          for (const r of results) out.push(...r);
          return out;
        }

        const [tips, subs, content, calls] = await Promise.all([
          getAllLogs({ address: ADDRESSES.tipJar, event: TipSentEvent, argKey: 'from' }),
          getAllLogs({ address: ADDRESSES.subscriptions, event: SubscribedEvent, argKey: 'subscriber' }),
          getAllLogs({ address: ADDRESSES.contentPaywall, event: AccessPurchasedEvent, argKey: 'buyer' }),
          getAllLogs({ address: ADDRESSES.payPerCall, event: PaidEvent, argKey: 'payer' }),
        ]);

        const all: Activity[] = [];
        for (const t of tips) {
          // Fan's perspective: show GROSS (net + protocol fee)
          const net = (t.args.netAmount ?? 0n) as bigint;
          const fee = (t.args.protocolFee ?? 0n) as bigint;
          all.push({
            kind: 'tip',
            blockNumber: t.blockNumber,
            txHash: t.transactionHash,
            timestamp: 0,
            tipId: t.args.tipId,
            usernameHash: t.args.usernameHash,
            amount: net + fee,
            message: t.args.message,
          });
        }
        for (const s of subs) {
          all.push({
            kind: 'subscribe',
            blockNumber: s.blockNumber,
            txHash: s.transactionHash,
            timestamp: 0,
            subId: s.args.subId,
            planId: s.args.planId,
            months: s.args.months,
            amount: s.args.amount,
          });
        }
        for (const c of content) {
          all.push({
            kind: 'content',
            blockNumber: c.blockNumber,
            txHash: c.transactionHash,
            timestamp: 0,
            contentId: c.args.contentId,
            amount: c.args.amount,
          });
        }
        for (const api of calls) {
          all.push({
            kind: 'api',
            blockNumber: api.blockNumber,
            txHash: api.transactionHash,
            timestamp: 0,
            callId: api.args.callId,
            endpointId: api.args.endpointId,
            amount: api.args.amount,
          });
        }

        // Enrich subscribe items with plan name + creator hash
        const subscribeItems = all.filter(a => a.kind === 'subscribe');
        await Promise.all(subscribeItems.map(async (s) => {
          try {
            const plan: any = await client.readContract({
              address: ADDRESSES.subscriptions, abi: subscriptionsFullAbi,
              functionName: 'getPlan', args: [s.planId!],
            });
            s.planName = plan.name;
            s.planCreatorHash = plan.creatorHash;
          } catch {}
        }));

        // Enrich content items with title + creator hash
        const contentItems = all.filter(a => a.kind === 'content');
        await Promise.all(contentItems.map(async (c) => {
          try {
            const info: any = await client.readContract({
              address: ADDRESSES.contentPaywall, abi: contentPaywallFullAbi,
              functionName: 'getContent', args: [c.contentId as `0x${string}`],
            });
            c.contentCreatorHash = info.creatorHash;
            // Parse metadata URI for title
            if (info.metadataURI?.startsWith('data:application/json,')) {
              try {
                const meta = JSON.parse(decodeURIComponent(info.metadataURI.slice('data:application/json,'.length)));
                c.contentTitle = meta.title || undefined;
              } catch {}
            }
          } catch {}
        }));

        // Enrich api items with endpoint name + creator hash
        const apiItems = all.filter(a => a.kind === 'api');
        await Promise.all(apiItems.map(async (a) => {
          try {
            const ep: any = await client.readContract({
              address: ADDRESSES.payPerCall, abi: payPerCallFullAbi,
              functionName: 'getEndpoint', args: [a.endpointId as `0x${string}`],
            });
            a.endpointName = ep.name;
            a.endpointCreatorHash = ep.creatorHash;
          } catch {}
        }));

        // Fetch block timestamps
        const uniqueBlocks = Array.from(new Set(all.map(a => a.blockNumber)));
        const blockMap = new Map<bigint, number>();
        await Promise.all(uniqueBlocks.map(async (bn) => {
          const blk = await client.getBlock({ blockNumber: bn });
          blockMap.set(bn, Number(blk.timestamp));
        }));
        for (const a of all) a.timestamp = blockMap.get(a.blockNumber) ?? 0;

        // Sort newest first
        all.sort((a, b) => {
          if (b.blockNumber === a.blockNumber) return 0;
          return b.blockNumber > a.blockNumber ? 1 : -1;
        });
        setItems(all);

        // Resolve username hashes to names (from tips + plan/content/api creators)
        const allHashes = all.flatMap(a => [
          a.usernameHash,
          a.planCreatorHash,
          a.contentCreatorHash,
          a.endpointCreatorHash,
        ]).filter((h): h is string => Boolean(h));
        const uniqHashes = Array.from(new Set(allHashes));
        const nameMap: Record<string, string> = {};
        await Promise.all(uniqHashes.map(async (h) => {
          try {
            const n = await client.readContract({
              address: ADDRESSES.registry, abi: registryAbi,
              functionName: 'getNameByHash', args: [h as `0x${string}`],
            });
            nameMap[h] = n as string;
          } catch {}
        }));
        setUsernameMap(nameMap);
      } finally { setLoading(false); }
    };
    load();
  }, [pub, address]);

  if (!isConnected) return (
    <div>
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h1 className="text-3xl font-bold">Your Activity</h1>
        <p className="text-muted mt-3">Connect your wallet to see tips sent, subscriptions, and purchases.</p>
      </main>
    </div>
  );

  const stats = {
    totalTips: items.filter(a => a.kind === 'tip').reduce((s, a) => s + (a.amount ?? 0n), 0n),
    totalSubs: items.filter(a => a.kind === 'subscribe').reduce((s, a) => s + (a.amount ?? 0n), 0n),
    totalContent: items.filter(a => a.kind === 'content').reduce((s, a) => s + (a.amount ?? 0n), 0n),
    totalApi: items.filter(a => a.kind === 'api').reduce((s, a) => s + (a.amount ?? 0n), 0n),
  };
  const grandTotal = stats.totalTips + stats.totalSubs + stats.totalContent + stats.totalApi;

  return (
    <div>
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Your Activity</h1>
          <p className="text-muted text-sm mt-1">
            Everything you've paid to creators from <AddressLink address={address!} />
          </p>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <StatBox label="Total paid" value={`${fmt(grandTotal)} USDC`} icon="💳" big />
          <StatBox label="Tips" value={`${fmt(stats.totalTips)} USDC`} icon="💸" />
          <StatBox label="Subscriptions" value={`${fmt(stats.totalSubs)} USDC`} icon="📅" />
          <StatBox label="Content" value={`${fmt(stats.totalContent)} USDC`} icon="🔒" />
          <StatBox label="API calls" value={`${fmt(stats.totalApi)} USDC`} icon="⚡" />
        </div>

        <h2 className="text-lg font-bold mb-3">History</h2>
        {loading ? (
          <div className="text-center py-8 text-muted">Loading your activity from chain...</div>
        ) : items.length === 0 ? (
          <div className="bg-panel border border-border rounded-2xl p-8 text-center">
            <p className="text-muted">No activity yet.</p>
            <p className="text-sm mt-2">
              Find a creator and send a tip!{' '}
              <Link href="https://arcpay.finance/gavin" target="_blank" className="text-accent underline">
                Try arcpay.finance/gavin ↗
              </Link>
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((a, i) => (
              <ActivityRow key={`${a.txHash}-${i}`} item={a} usernameMap={usernameMap} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function fmt(v: bigint) { return Number(formatUnits(v, 18)).toFixed(4); }

function StatBox({ label, value, icon, big }: { label: string; value: string; icon: string; big?: boolean }) {
  return (
    <div className={`bg-panel border border-border rounded-2xl p-4 ${big ? 'md:col-span-1' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted uppercase tracking-wider">{label}</div>
        <span>{icon}</span>
      </div>
      <div className={`font-bold mt-1 ${big ? 'text-xl' : 'text-lg'}`}>{value}</div>
    </div>
  );
}

function ActivityRow({ item, usernameMap }: { item: Activity; usernameMap: Record<string, string> }) {
  const time = new Date(item.timestamp * 1000).toLocaleString();
  const icon = { tip: '💸', subscribe: '📅', content: '🔒', api: '⚡' }[item.kind];
  const color = {
    tip: 'bg-pink-500/10 text-pink-600',
    subscribe: 'bg-blue-500/10 text-blue-600',
    content: 'bg-purple-500/10 text-purple-600',
    api: 'bg-amber-500/10 text-amber-600',
  }[item.kind];

  const tipCreator = item.usernameHash ? usernameMap[item.usernameHash] : null;
  const subCreator = item.planCreatorHash ? usernameMap[item.planCreatorHash] : null;
  const contentCreator = item.contentCreatorHash ? usernameMap[item.contentCreatorHash] : null;
  const apiCreator = item.endpointCreatorHash ? usernameMap[item.endpointCreatorHash] : null;

  const CreatorLink = ({ name }: { name: string }) => (
    <a href={`https://arcpay.finance/${name}`} target="_blank" rel="noopener noreferrer"
      className="font-bold hover:text-accent underline decoration-dotted">
      @{name}
    </a>
  );

  let detail: React.ReactNode = null;
  if (item.kind === 'tip') {
    detail = (
      <>
        Tipped {tipCreator ? <CreatorLink name={tipCreator} /> : <strong>@?</strong>}
        {item.message && <span className="text-muted"> — "{item.message}"</span>}
      </>
    );
  } else if (item.kind === 'subscribe') {
    detail = (
      <>
        Subscribed to <strong>{item.planName || `plan #${item.planId}`}</strong>
        {subCreator && <> by {<CreatorLink name={subCreator} />}</>}
        {' '}for <strong>{item.months?.toString()} month{item.months !== 1n ? 's' : ''}</strong>
      </>
    );
  } else if (item.kind === 'content') {
    detail = (
      <>
        Unlocked <strong>{item.contentTitle || 'content'}</strong>
        {contentCreator && <> from {<CreatorLink name={contentCreator} />}</>}
      </>
    );
  } else if (item.kind === 'api') {
    detail = (
      <>
        Paid for <strong className="font-mono">{item.endpointName || `endpoint`}</strong>
        {apiCreator && <> on {<CreatorLink name={apiCreator} />}</>}
        {item.callId !== undefined && <span className="text-muted"> (call #{item.callId.toString()})</span>}
      </>
    );
  }

  return (
    <div className="bg-panel border border-border rounded-2xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${color}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm">{detail}</div>
        <div className="text-xs text-muted mt-1">
          {time} · <TxLink tx={item.txHash} />
        </div>
      </div>
      <div className="font-bold text-sm whitespace-nowrap">
        −{fmt(item.amount ?? 0n)} USDC
      </div>
    </div>
  );
}
