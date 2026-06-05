import { describe, it, expect } from "bun:test";
import { YnabClient } from "../src/client.js";

const apiKey = process.env.YNAB_API_KEY;

describe.skipIf(!apiKey)("smoke", () => {
  it(
    "calls every API endpoint once",
    async () => {
      const client = new YnabClient({ apiKey: apiKey! });

      // 1. List budgets
      const { budgets } = await client.listBudgets();
      expect(budgets.length).toBeGreaterThan(0);
      const budgetId = budgets[0]!.id;
      expect(typeof budgetId).toBe("string");

      // 2. Get budget
      const budget = await client.getBudget(budgetId);
      expect(budget.id).toBe(budgetId);

      // 3. List accounts
      const { accounts } = await client.listAccounts(budgetId);
      expect(accounts.length).toBeGreaterThan(0);
      const accountId = accounts[0]!.id;

      // 4. Get account
      const account = await client.getAccount(budgetId, accountId);
      expect(account.id).toBe(accountId);

      // 5. List categories
      const { category_groups } = await client.listCategories(budgetId);
      expect(category_groups.length).toBeGreaterThan(0);
      const firstCategory = category_groups[0]!.categories[0];
      expect(firstCategory).toBeDefined();
      const categoryId = firstCategory!.id;

      // 6. Get category
      const category = await client.getCategory(budgetId, categoryId);
      expect(category.id).toBe(categoryId);

      // 7. List payees
      const { payees } = await client.listPayees(budgetId);
      expect(payees.length).toBeGreaterThan(0);
      const payeeId = payees[0]!.id;

      // 8. Get payee
      const payee = await client.getPayee(budgetId, payeeId);
      expect(payee.id).toBe(payeeId);

      // 9. List transactions
      const { transactions } = await client.listTransactions(budgetId);
      if (transactions.length > 0) {
        const transactionId = transactions[0]!.id;

        // 10. Get transaction
        const transaction = await client.getTransaction(budgetId, transactionId);
        expect(transaction.id).toBe(transactionId);
      } else {
        console.warn("[smoke] No transactions found — skipping getTransaction");
      }

      // 11. List scheduled transactions
      const { scheduled_transactions } = await client.listScheduledTransactions(budgetId);
      expect(Array.isArray(scheduled_transactions)).toBe(true);

      // 12. List months
      const { months } = await client.listMonths(budgetId);
      expect(months.length).toBeGreaterThan(0);
      const month = months[0]!.month;

      // 13. Get month
      const monthDetail = await client.getMonth(budgetId, month);
      expect(monthDetail.month).toBe(month);
    },
    30_000
  );
});
