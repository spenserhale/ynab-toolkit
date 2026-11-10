import { buildApplication, buildRouteMap } from "@stricli/core";

import { listBudgetsCommand } from "./commands/budgets/list.js";
import { getBudgetCommand } from "./commands/budgets/get.js";

import { listAccountsCommand } from "./commands/accounts/list.js";
import { getAccountCommand } from "./commands/accounts/get.js";
import { createAccountCommand } from "./commands/accounts/create.js";

import { listCategoriesCommand } from "./commands/categories/list.js";
import { getCategoryCommand } from "./commands/categories/get.js";
import { updateMonthCategoryCommand } from "./commands/categories/update-month.js";

import { listPayeesCommand } from "./commands/payees/list.js";
import { getPayeeCommand } from "./commands/payees/get.js";

import { listTransactionsCommand } from "./commands/transactions/list.js";
import { getTransactionCommand } from "./commands/transactions/get.js";
import { createTransactionCommand } from "./commands/transactions/create.js";
import { updateTransactionCommand } from "./commands/transactions/update.js";
import { deleteTransactionCommand } from "./commands/transactions/delete.js";
import { importTransactionsCommand } from "./commands/transactions/import.js";
import { importLinkedTransactionsCommand } from "./commands/transactions/import-linked.js";

import { listScheduledTransactionsCommand } from "./commands/scheduled-transactions/list.js";
import { getScheduledTransactionCommand } from "./commands/scheduled-transactions/get.js";

import { authSetCommand } from "./commands/auth/set.js";
import { authListCommand } from "./commands/auth/list.js";
import { authDeleteCommand } from "./commands/auth/delete.js";
import { authMigrateCommand } from "./commands/auth/migrate.js";

import { showConfigCommand } from "./commands/config/show.js";

import { listMonthsCommand } from "./commands/months/list.js";
import { getMonthCommand } from "./commands/months/get.js";

const routes = buildRouteMap({
  routes: {
    auth: buildRouteMap({
      routes: {
        set: authSetCommand,
        list: authListCommand,
        delete: authDeleteCommand,
        migrate: authMigrateCommand,
      },
      docs: { brief: "Store, list, delete, and migrate credentials in the OS keychain" },
    }),
    config: buildRouteMap({
      routes: { show: showConfigCommand },
      docs: { brief: "Inspect resolved configuration (secrets redacted)" },
    }),
    budgets: buildRouteMap({
      routes: { list: listBudgetsCommand, get: getBudgetCommand },
      docs: { brief: "List and get budgets" },
    }),
    accounts: buildRouteMap({
      routes: { list: listAccountsCommand, get: getAccountCommand, create: createAccountCommand },
      docs: { brief: "List, get, and create accounts" },
    }),
    categories: buildRouteMap({
      routes: {
        list: listCategoriesCommand,
        get: getCategoryCommand,
        "update-month": updateMonthCategoryCommand,
      },
      docs: { brief: "List and get categories; update monthly budgeted amounts" },
    }),
    payees: buildRouteMap({
      routes: { list: listPayeesCommand, get: getPayeeCommand },
      docs: { brief: "List and get payees" },
    }),
    transactions: buildRouteMap({
      routes: {
        list: listTransactionsCommand,
        get: getTransactionCommand,
        create: createTransactionCommand,
        update: updateTransactionCommand,
        delete: deleteTransactionCommand,
        import: importTransactionsCommand,
        "import-linked": importLinkedTransactionsCommand,
      },
      docs: { brief: "List, get, create, import, update, and delete transactions" },
    }),
    "scheduled-transactions": buildRouteMap({
      routes: {
        list: listScheduledTransactionsCommand,
        get: getScheduledTransactionCommand,
      },
      docs: { brief: "List and get scheduled transactions" },
    }),
    months: buildRouteMap({
      routes: { list: listMonthsCommand, get: getMonthCommand },
      docs: { brief: "List and get budget months" },
    }),
  },
  docs: { brief: "YNAB CLI — agent-native commands for You Need A Budget" },
});

export const app = buildApplication(routes, {
  name: "ynab",
  versionInfo: { currentVersion: "0.2.0" },
});
