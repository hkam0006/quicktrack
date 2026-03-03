import { useLocalSearchParams, useRouter } from 'expo-router';

import { TransactionSheet } from '@/src/features/transactions/transaction-sheet';

export default function AddTransactionModal() {
  const router = useRouter();
  const { transactionId } = useLocalSearchParams<{ transactionId?: string | string[] }>();
  const editTransactionId = typeof transactionId === 'string' ? transactionId : transactionId?.[0];

  return <TransactionSheet transactionId={editTransactionId} onClose={() => router.back()} />;
}
