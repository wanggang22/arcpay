import {
  createPublicClient, createWalletClient, http, parseUnits, formatUnits,
  type PublicClient, type WalletClient, type Account, type Hex, type Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { NETWORKS, type NetworkConfig } from './networks.js';
import {
  registryAbi, tipJarAbi, subscriptionsAbi, contentPaywallAbi, payPerCallAbi,
} from './abis.js';

export interface ArcPayClientOptions {
  /** Network: 'local' or 'testnet' */
  network?: 'local' | 'testnet';
  /** Override network config (use your own deployment addresses) */
  customConfig?: NetworkConfig;
  /** Private key — if provided, enables write methods */
  privateKey?: Hex;
  /** Custom RPC URL override */
  rpcUrl?: string;
}

/**
 * ArcPay SDK — top-level client. Expose module-specific helpers via `.tips`, `.subs`, `.paywall`, `.api`.
 */
export class ArcPayClient {
  readonly config: NetworkConfig;
  readonly publicClient: PublicClient;
  readonly walletClient: WalletClient | null = null;
  readonly account: Account | null = null;

  public readonly tips: TipsClient;
  public readonly subs: SubscriptionsClient;
  public readonly paywall: PaywallClient;
  public readonly api: PayPerCallClient;
  public readonly registry: RegistryClient;

  constructor(opts: ArcPayClientOptions = {}) {
    const netKey = opts.network ?? 'local';
    const cfg = opts.customConfig ?? NETWORKS[netKey];
    if (!cfg) throw new Error(`Unknown network: ${netKey}`);
    this.config = cfg;

    const rpcTransport = opts.rpcUrl ? http(opts.rpcUrl) : http();
    this.publicClient = createPublicClient({ chain: cfg.chain, transport: rpcTransport }) as PublicClient;

    if (opts.privateKey) {
      const pk = opts.privateKey.startsWith('0x') ? opts.privateKey : (`0x${opts.privateKey}` as Hex);
      this.account = privateKeyToAccount(pk);
      this.walletClient = createWalletClient({
        chain: cfg.chain,
        transport: rpcTransport,
        account: this.account,
      });
    }

    this.registry = new RegistryClient(this);
    this.tips = new TipsClient(this);
    this.subs = new SubscriptionsClient(this);
    this.paywall = new PaywallClient(this);
    this.api = new PayPerCallClient(this);
  }

  _requireWallet(): { walletClient: WalletClient; account: Account } {
    if (!this.walletClient || !this.account) throw new Error('Write requires privateKey in constructor');
    return { walletClient: this.walletClient, account: this.account };
  }
}

// ─── Registry ─────────────────────────────────────────────────────

class RegistryClient {
  constructor(private client: ArcPayClient) {}

  async register(username: string, displayName = '', metadataURI = ''): Promise<Hex> {
    const { walletClient, account } = this.client._requireWallet();
    const hash = await walletClient.writeContract({
      address: this.client.config.addresses.registry,
      abi: registryAbi,
      functionName: 'register',
      args: [username, displayName, metadataURI],
      account,
      chain: this.client.config.chain,
    });
    await this.client.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  async exists(username: string): Promise<boolean> {
    return this.client.publicClient.readContract({
      address: this.client.config.addresses.registry,
      abi: registryAbi, functionName: 'exists', args: [username],
    }) as Promise<boolean>;
  }

  async getPayoutAddress(username: string): Promise<Address> {
    return this.client.publicClient.readContract({
      address: this.client.config.addresses.registry,
      abi: registryAbi, functionName: 'getPayoutAddress', args: [username],
    }) as Promise<Address>;
  }

  async getCreator(username: string) {
    return this.client.publicClient.readContract({
      address: this.client.config.addresses.registry,
      abi: registryAbi, functionName: 'getCreator', args: [username],
    });
  }
}

// ─── Tips ─────────────────────────────────────────────────────────

export interface TipOptions {
  /** Target creator's registered username */
  username: string;
  /** Amount as string (e.g., "0.005") or bigint (wei) */
  amount: string | bigint;
  /** Optional message (≤280 chars recommended) */
  message?: string;
}

class TipsClient {
  constructor(private client: ArcPayClient) {}

  async send({ username, amount, message = '' }: TipOptions): Promise<Hex> {
    const { walletClient, account } = this.client._requireWallet();
    const wei = typeof amount === 'bigint' ? amount : parseUnits(String(amount), 18);
    const hash = await walletClient.writeContract({
      address: this.client.config.addresses.tipJar,
      abi: tipJarAbi, functionName: 'tip',
      args: [username, message], value: wei,
      account, chain: this.client.config.chain,
    });
    await this.client.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  async sendToAddress(recipient: Address, amount: string | bigint, message = ''): Promise<Hex> {
    const { walletClient, account } = this.client._requireWallet();
    const wei = typeof amount === 'bigint' ? amount : parseUnits(String(amount), 18);
    const hash = await walletClient.writeContract({
      address: this.client.config.addresses.tipJar,
      abi: tipJarAbi, functionName: 'tipAddress',
      args: [recipient, message], value: wei,
      account, chain: this.client.config.chain,
    });
    await this.client.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  async getLifetimeReceived(username: string): Promise<bigint> {
    return this.client.publicClient.readContract({
      address: this.client.config.addresses.tipJar,
      abi: tipJarAbi, functionName: 'getLifetimeReceived', args: [username],
    }) as Promise<bigint>;
  }

  async getTipsByCreator(username: string): Promise<readonly bigint[]> {
    return this.client.publicClient.readContract({
      address: this.client.config.addresses.tipJar,
      abi: tipJarAbi, functionName: 'getTipsByCreator', args: [username],
    }) as Promise<readonly bigint[]>;
  }

  async getTip(tipId: bigint) {
    return this.client.publicClient.readContract({
      address: this.client.config.addresses.tipJar,
      abi: tipJarAbi, functionName: 'getTip', args: [tipId],
    });
  }
}

// ─── Subscriptions ────────────────────────────────────────────────

class SubscriptionsClient {
  constructor(private client: ArcPayClient) {}

  async createPlan(username: string, name: string, pricePerMonth: string | bigint, metadataURI = ''): Promise<Hex> {
    const { walletClient, account } = this.client._requireWallet();
    const wei = typeof pricePerMonth === 'bigint' ? pricePerMonth : parseUnits(String(pricePerMonth), 18);
    const hash = await walletClient.writeContract({
      address: this.client.config.addresses.subscriptions,
      abi: subscriptionsAbi, functionName: 'createPlan',
      args: [username, name, wei, metadataURI],
      account, chain: this.client.config.chain,
    });
    await this.client.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  async subscribe(planId: bigint | number, months: number): Promise<Hex> {
    const { walletClient, account } = this.client._requireWallet();
    const plan = await this.getPlan(BigInt(planId));
    const total = (plan.pricePerMonth as bigint) * BigInt(months);
    const hash = await walletClient.writeContract({
      address: this.client.config.addresses.subscriptions,
      abi: subscriptionsAbi, functionName: 'subscribe',
      args: [BigInt(planId), BigInt(months)], value: total,
      account, chain: this.client.config.chain,
    });
    await this.client.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  async cancel(subId: bigint | number): Promise<Hex> {
    const { walletClient, account } = this.client._requireWallet();
    const hash = await walletClient.writeContract({
      address: this.client.config.addresses.subscriptions,
      abi: subscriptionsAbi, functionName: 'cancel',
      args: [BigInt(subId)],
      account, chain: this.client.config.chain,
    });
    await this.client.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  async withdraw(username: string): Promise<Hex> {
    const { walletClient, account } = this.client._requireWallet();
    const hash = await walletClient.writeContract({
      address: this.client.config.addresses.subscriptions,
      abi: subscriptionsAbi, functionName: 'withdraw',
      args: [username],
      account, chain: this.client.config.chain,
    });
    await this.client.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  async getPlan(planId: bigint): Promise<any> {
    return this.client.publicClient.readContract({
      address: this.client.config.addresses.subscriptions,
      abi: subscriptionsAbi, functionName: 'getPlan', args: [planId],
    });
  }

  async isActive(subscriber: Address, planId: bigint | number): Promise<boolean> {
    return this.client.publicClient.readContract({
      address: this.client.config.addresses.subscriptions,
      abi: subscriptionsAbi, functionName: 'isActive',
      args: [subscriber, BigInt(planId)],
    }) as Promise<boolean>;
  }
}

// ─── Paywall ──────────────────────────────────────────────────────

class PaywallClient {
  constructor(private client: ArcPayClient) {}

  async createContent(username: string, contentId: Hex, price: string | bigint, metadataURI = ''): Promise<Hex> {
    const { walletClient, account } = this.client._requireWallet();
    const wei = typeof price === 'bigint' ? price : parseUnits(String(price), 18);
    const hash = await walletClient.writeContract({
      address: this.client.config.addresses.contentPaywall,
      abi: contentPaywallAbi, functionName: 'createContent',
      args: [username, contentId, wei, metadataURI],
      account, chain: this.client.config.chain,
    });
    await this.client.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  async purchase(contentId: Hex, price: bigint): Promise<Hex> {
    const { walletClient, account } = this.client._requireWallet();
    const hash = await walletClient.writeContract({
      address: this.client.config.addresses.contentPaywall,
      abi: contentPaywallAbi, functionName: 'purchase',
      args: [contentId], value: price,
      account, chain: this.client.config.chain,
    });
    await this.client.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  async checkAccess(contentId: Hex, user: Address): Promise<boolean> {
    return this.client.publicClient.readContract({
      address: this.client.config.addresses.contentPaywall,
      abi: contentPaywallAbi, functionName: 'checkAccess',
      args: [contentId, user],
    }) as Promise<boolean>;
  }

  async getContent(contentId: Hex): Promise<any> {
    return this.client.publicClient.readContract({
      address: this.client.config.addresses.contentPaywall,
      abi: contentPaywallAbi, functionName: 'getContent', args: [contentId],
    });
  }
}

// ─── PayPerCall ──────────────────────────────────────────────────

class PayPerCallClient {
  constructor(private client: ArcPayClient) {}

  async registerEndpoint(username: string, name: string, pricePerCall: string | bigint): Promise<Hex> {
    const { walletClient, account } = this.client._requireWallet();
    const wei = typeof pricePerCall === 'bigint' ? pricePerCall : parseUnits(String(pricePerCall), 18);
    const hash = await walletClient.writeContract({
      address: this.client.config.addresses.payPerCall,
      abi: payPerCallAbi, functionName: 'registerEndpoint',
      args: [username, name, wei],
      account, chain: this.client.config.chain,
    });
    await this.client.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  async pay(username: string, endpointName: string, amount: bigint): Promise<Hex> {
    const { walletClient, account } = this.client._requireWallet();
    const hash = await walletClient.writeContract({
      address: this.client.config.addresses.payPerCall,
      abi: payPerCallAbi, functionName: 'payByName',
      args: [username, endpointName], value: amount,
      account, chain: this.client.config.chain,
    });
    await this.client.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  /**
   * Prepay `count` API call credits in a single on-chain transaction.
   * Wraps PayPerCall.sol::batchPay(bytes32 endpointId, uint256 count).
   * Each credit has a unique callId that can be consumed with a signed off-chain request.
   */
  async batchPay(username: string, endpointName: string, count: number | bigint): Promise<Hex> {
    const { walletClient, account } = this.client._requireWallet();
    const endpoint = await this.getEndpointByName(username, endpointName);
    const countBig = typeof count === 'bigint' ? count : BigInt(count);
    const value = endpoint.pricePerCall * countBig;
    const hash = await walletClient.writeContract({
      address: this.client.config.addresses.payPerCall,
      abi: payPerCallAbi, functionName: 'batchPay',
      args: [endpoint.id, countBig], value,
      account, chain: this.client.config.chain,
    });
    await this.client.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  async getEndpointByName(username: string, name: string): Promise<any> {
    return this.client.publicClient.readContract({
      address: this.client.config.addresses.payPerCall,
      abi: payPerCallAbi, functionName: 'getEndpointByName',
      args: [username, name],
    });
  }

  async getReceipt(callId: bigint): Promise<any> {
    return this.client.publicClient.readContract({
      address: this.client.config.addresses.payPerCall,
      abi: payPerCallAbi, functionName: 'getReceipt', args: [callId],
    });
  }
}
