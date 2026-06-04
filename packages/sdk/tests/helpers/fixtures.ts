export const Fixtures = {
  budgets: {
    list: {
      budgets: [
        {
          id: "budget-1",
          name: "My Budget",
          last_modified_on: "2024-01-01T00:00:00Z",
          first_month: "2024-01-01",
          last_month: "2024-12-01",
        },
      ],
      server_knowledge: 100,
    },
    get: {
      budget: {
        id: "budget-1",
        name: "My Budget",
        last_modified_on: "2024-01-01T00:00:00Z",
        first_month: "2024-01-01",
        last_month: "2024-12-01",
      },
      server_knowledge: 100,
    },
  },
  accounts: {
    list: {
      accounts: [
        {
          id: "account-1",
          name: "Checking",
          type: "checking",
          on_budget: true,
          closed: false,
          balance: 125000,
          cleared_balance: 125000,
          uncleared_balance: 0,
          transfer_payee_id: "payee-transfer-1",
          deleted: false,
        },
      ],
      server_knowledge: 100,
    },
    get: {
      account: {
        id: "account-1",
        name: "Checking",
        type: "checking",
        on_budget: true,
        closed: false,
        balance: 125000,
        cleared_balance: 125000,
        uncleared_balance: 0,
        transfer_payee_id: "payee-transfer-1",
        deleted: false,
      },
    },
  },
  categories: {
    list: {
      category_groups: [
        {
          id: "group-1",
          name: "Housing",
          hidden: false,
          deleted: false,
          categories: [
            {
              id: "cat-1",
              category_group_id: "group-1",
              name: "Rent",
              hidden: false,
              budgeted: 150000,
              activity: -150000,
              balance: 0,
              deleted: false,
            },
          ],
        },
      ],
      server_knowledge: 100,
    },
    get: {
      category: {
        id: "cat-1",
        category_group_id: "group-1",
        name: "Rent",
        hidden: false,
        budgeted: 150000,
        activity: -150000,
        balance: 0,
        deleted: false,
      },
    },
    update: {
      category: {
        id: "cat-1",
        category_group_id: "group-1",
        name: "Rent",
        hidden: false,
        budgeted: 200000,
        activity: -150000,
        balance: 50000,
        deleted: false,
      },
    },
  },
  payees: {
    list: {
      payees: [{ id: "payee-1", name: "Amazon", deleted: false }],
      server_knowledge: 100,
    },
    get: {
      payee: { id: "payee-1", name: "Amazon", deleted: false },
    },
  },
  transactions: {
    list: {
      transactions: [
        {
          id: "txn-1",
          date: "2024-01-15",
          amount: -42500,
          cleared: "cleared",
          approved: true,
          account_id: "account-1",
          account_name: "Checking",
          deleted: false,
          subtransactions: [],
        },
      ],
      server_knowledge: 100,
    },
    get: {
      transaction: {
        id: "txn-1",
        date: "2024-01-15",
        amount: -42500,
        cleared: "cleared",
        approved: true,
        account_id: "account-1",
        account_name: "Checking",
        deleted: false,
        subtransactions: [],
      },
    },
    create: {
      transaction: {
        id: "txn-2",
        date: "2024-01-16",
        amount: -10000,
        cleared: "uncleared",
        approved: false,
        account_id: "account-1",
        account_name: "Checking",
        deleted: false,
        subtransactions: [],
      },
      duplicate_import_ids: [] as string[],
    },
    bulk: {
      transaction_ids: ["txn-2", "txn-3"],
      duplicate_import_ids: [] as string[],
    },
    deleteResponse: {
      transaction: {
        id: "txn-1",
        date: "2024-01-15",
        amount: -42500,
        cleared: "cleared",
        approved: true,
        account_id: "account-1",
        account_name: "Checking",
        deleted: true,
        subtransactions: [],
      },
    },
  },
  scheduledTransactions: {
    list: {
      scheduled_transactions: [
        {
          id: "sched-1",
          date_first: "2024-01-01",
          date_next: "2024-02-01",
          frequency: "monthly",
          amount: -150000,
          account_id: "account-1",
          deleted: false,
        },
      ],
      server_knowledge: 100,
    },
    get: {
      scheduled_transaction: {
        id: "sched-1",
        date_first: "2024-01-01",
        date_next: "2024-02-01",
        frequency: "monthly",
        amount: -150000,
        account_id: "account-1",
        deleted: false,
      },
    },
  },
  months: {
    list: {
      months: [
        {
          month: "2024-01-01",
          income: 500000,
          budgeted: 400000,
          activity: -380000,
          to_be_budgeted: 120000,
          deleted: false,
        },
      ],
    },
    get: {
      month: {
        month: "2024-01-01",
        income: 500000,
        budgeted: 400000,
        activity: -380000,
        to_be_budgeted: 120000,
        deleted: false,
        categories: [] as unknown[],
      },
    },
  },
} as const;
