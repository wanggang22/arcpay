'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { ADDRESSES, registryAbi } from '@/lib/config';

const Ctx = createContext<{ username: string | null; loading: boolean }>({ username: null, loading: true });

export function UsernameProvider({ children }: { children: React.ReactNode }) {
  const { address } = useAccount();
  const [loading, setLoading] = useState(true);

  const { data: hashes } = useReadContract({
    address: ADDRESSES.registry, abi: registryAbi, functionName: 'getUsernamesByAddress',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 5000 },
  });

  const { data: name } = useReadContract({
    address: ADDRESSES.registry, abi: registryAbi, functionName: 'getNameByHash',
    args: hashes && hashes.length > 0 ? [hashes[0]] : undefined,
    query: { enabled: !!hashes && hashes.length > 0 },
  });

  useEffect(() => {
    if (hashes !== undefined) setLoading(false);
  }, [hashes]);

  return <Ctx.Provider value={{ username: name || null, loading }}>{children}</Ctx.Provider>;
}

export const useUsername = () => useContext(Ctx);
