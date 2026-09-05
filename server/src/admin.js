import { getUsers, getPurchases, getOrders, getTransactions } from './db.js';

export function getAllUsersWithData() {
  const users = getUsers();
  return users.map((user) => ({
    email: user.email,
    name: user.name,
    role: user.role,
    balance: user.balance,
    avatar: user.avatar || null,
    googleOnly: user.googleOnly === 1,
    createdAt: user.createdAt,
    purchases: getPurchases(user.email),
    orderCount: getOrders(user.email).length,
    transactions: getTransactions(user.email).length,
  }));
}