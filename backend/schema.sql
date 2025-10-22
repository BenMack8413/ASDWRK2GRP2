PRAGMA foreign_keys = ON;

-- USERS
CREATE TABLE IF NOT EXISTS users (
  user_id     INTEGER PRIMARY KEY,
  username    TEXT NOT NULL UNIQUE,
  email       TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  date_created DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- BUDGETS
CREATE TABLE IF NOT EXISTS budgets (
  budget_id   INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL,
  name        TEXT,
  currency    TEXT NOT NULL CHECK(length(currency) = 3),
  date_created DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO users (user_id, username, email, password_hash)
VALUES (1, 'demo', 'demo@example.com', '$2b$10$jlrP6zRp71UDJV.JHoFnH.8y0e4BjNZDWEcNT9j9sZ/0j/jDRvzcm');
-- password is hashedpassword123

INSERT OR IGNORE INTO budgets (budget_id, user_id, name, currency)
VALUES (1, 1, 'Default Budget', 'USD');

-- SETTINGS (one row per budget)
CREATE TABLE IF NOT EXISTS settings (
  user_id INTEGER PRIMARY KEY,
  data      TEXT,
  FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ACCOUNTS (scoped to budget)
CREATE TABLE IF NOT EXISTS accounts (
  account_id INTEGER PRIMARY KEY,
  budget_id  INTEGER NOT NULL,
  name       TEXT NOT NULL,
  currency   TEXT NOT NULL CHECK(length(currency)=3),
  balance    INTEGER DEFAULT 0, -- cents
  UNIQUE(budget_id, name),
  FOREIGN KEY(budget_id) REFERENCES budgets(budget_id) ON DELETE CASCADE
);

-- CATEGORIES (scoped to budget)
CREATE TABLE IF NOT EXISTS categories (
  category_id INTEGER PRIMARY KEY,
  budget_id   INTEGER NOT NULL,
  name        TEXT NOT NULL COLLATE NOCASE,
  type        TEXT,
  UNIQUE(budget_id, name),
  FOREIGN KEY(budget_id) REFERENCES budgets(budget_id) ON DELETE CASCADE
);

-- PAYEES
CREATE TABLE IF NOT EXISTS payees (
  payee_id INTEGER PRIMARY KEY,
  budget_id INTEGER NOT NULL,
  name     TEXT NOT NULL COLLATE NOCASE,
  UNIQUE(budget_id, name),
  FOREIGN KEY(budget_id) REFERENCES budgets(budget_id) ON DELETE CASCADE
);

-- TAGS
CREATE TABLE IF NOT EXISTS tags (
  tag_id   INTEGER PRIMARY KEY,
  budget_id INTEGER NOT NULL,
  name     TEXT NOT NULL COLLATE NOCASE,
  UNIQUE(budget_id, name),
  FOREIGN KEY(budget_id) REFERENCES budgets(budget_id) ON DELETE CASCADE
);

-- INCOME
CREATE TABLE IF NOT EXISTS incomes (
  income_id   INTEGER PRIMARY KEY,
  budget_id   INTEGER NOT NULL,
  user_id     INTEGER,          
  account_id  INTEGER,            
  amount      INTEGER NOT NULL,   
  source      TEXT,
  date        TEXT NOT NULL,
  frequency   TEXT,
  notes       TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(budget_id) REFERENCES budgets(budget_id) ON DELETE CASCADE,
  FOREIGN KEY(user_id)   REFERENCES users(user_id)     ON DELETE CASCADE,
  FOREIGN KEY(account_id) REFERENCES accounts(account_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_incomes_budget_date ON incomes(budget_id, date);

-- TRANSACTIONS (header)
CREATE TABLE IF NOT EXISTS transactions (
  transaction_id INTEGER PRIMARY KEY,
  budget_id      INTEGER NOT NULL,
  account_id     INTEGER,
  payee_id       INTEGER,
  date           TEXT NOT NULL,
  amount         INTEGER NOT NULL DEFAULT 0, -- cents (kept equal to SUM(lines))
  notes          TEXT,
  type           TEXT,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(budget_id)  REFERENCES budgets(budget_id) ON DELETE CASCADE,
  FOREIGN KEY(account_id) REFERENCES accounts(account_id) ON DELETE CASCADE,
  FOREIGN KEY(payee_id)   REFERENCES payees(payee_id) ON DELETE CASCADE
);

-- TRANSACTION LINES (detail rows)
CREATE TABLE IF NOT EXISTS transaction_lines (
  line_id        INTEGER PRIMARY KEY,
  transaction_id INTEGER NOT NULL,
  category_id    INTEGER,
  amount         INTEGER NOT NULL,  -- cents
  line_order     INTEGER,
  note           TEXT,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(transaction_id) REFERENCES transactions(transaction_id) ON DELETE CASCADE,
  FOREIGN KEY(category_id)    REFERENCES categories(category_id) ON DELETE CASCADE
);

-- TRANSACTION_TAGS (many-to-many)
CREATE TABLE IF NOT EXISTS transaction_tags (
  transaction_id INTEGER NOT NULL,
  tag_id         INTEGER NOT NULL,
  PRIMARY KEY (transaction_id, tag_id),
  FOREIGN KEY(transaction_id) REFERENCES transactions(transaction_id) ON DELETE CASCADE,
  FOREIGN KEY(tag_id)         REFERENCES tags(tag_id)         ON DELETE CASCADE
);

-- CHARTS
CREATE TABLE IF NOT EXISTS charts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    config TEXT NOT NULL
);

-- CHART_CONFIGS
CREATE TABLE IF NOT EXISTS chart_configs (
  config_id   INTEGER PRIMARY KEY,
  budget_id   INTEGER NOT NULL,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL, -- e.g. 'pie', 'bar'
  config_json TEXT NOT NULL, -- serialized filters, ranges, options
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(budget_id) REFERENCES budgets(budget_id) ON DELETE CASCADE
);

-- BUDGET_SIMPLE
CREATE TABLE IF NOT EXISTS budget_simple (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    date_created DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_budget_date ON transactions(budget_id, date);
CREATE INDEX IF NOT EXISTS idx_transaction_lines_transaction ON transaction_lines(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_lines_category ON transaction_lines(category_id);
CREATE INDEX IF NOT EXISTS idx_accounts_budget ON accounts(budget_id);
CREATE INDEX IF NOT EXISTS idx_categories_budget ON categories(budget_id);
CREATE INDEX IF NOT EXISTS idx_tags_budget ON tags(budget_id);


--------------------------------------------------------------------------------
-- Triggers: budget consistency checks (keep references within same budget)
--------------------------------------------------------------------------------
-- Check account budget matches transaction budget
CREATE TRIGGER IF NOT EXISTS trg_tx_account_budget_check
BEFORE INSERT ON transactions
FOR EACH ROW
WHEN NEW.account_id IS NOT NULL
BEGIN
  SELECT CASE
    WHEN (SELECT budget_id FROM accounts WHERE account_id = NEW.account_id) != NEW.budget_id
    THEN RAISE(ABORT, 'account and transaction budget mismatch')
  END;
END;

CREATE TRIGGER IF NOT EXISTS trg_tx_account_budget_check_upd
BEFORE UPDATE OF account_id, budget_id ON transactions
FOR EACH ROW
WHEN NEW.account_id IS NOT NULL
BEGIN
  SELECT CASE
    WHEN (SELECT budget_id FROM accounts WHERE account_id = NEW.account_id) != NEW.budget_id
    THEN RAISE(ABORT, 'account and transaction budget mismatch on update')
  END;
END;

-- Check payee budget matches transaction budget
CREATE TRIGGER IF NOT EXISTS trg_tx_payee_budget_check
BEFORE INSERT ON transactions
FOR EACH ROW
WHEN NEW.payee_id IS NOT NULL
BEGIN
  SELECT CASE
    WHEN (SELECT budget_id FROM payees WHERE payee_id = NEW.payee_id) != NEW.budget_id
    THEN RAISE(ABORT, 'payee and transaction budget mismatch')
  END;
END;

CREATE TRIGGER IF NOT EXISTS trg_tx_payee_budget_check_upd
BEFORE UPDATE OF payee_id, budget_id ON transactions
FOR EACH ROW
WHEN NEW.payee_id IS NOT NULL
BEGIN
  SELECT CASE
    WHEN (SELECT budget_id FROM payees WHERE payee_id = NEW.payee_id) != NEW.budget_id
    THEN RAISE(ABORT, 'payee and transaction budget mismatch on update')
  END;
END;

-- Check category budget matches transaction budget for lines
CREATE TRIGGER IF NOT EXISTS trg_line_category_budget_check
BEFORE INSERT ON transaction_lines
FOR EACH ROW
WHEN NEW.category_id IS NOT NULL
BEGIN
  SELECT CASE
    WHEN (SELECT budget_id FROM categories WHERE category_id = NEW.category_id)
         != (SELECT budget_id FROM transactions WHERE transaction_id = NEW.transaction_id)
    THEN RAISE(ABORT, 'category and transaction budget mismatch on line insert')
  END;
END;

CREATE TRIGGER IF NOT EXISTS trg_line_category_budget_check_upd
BEFORE UPDATE OF category_id, transaction_id ON transaction_lines
FOR EACH ROW
WHEN NEW.category_id IS NOT NULL
BEGIN
  SELECT CASE
    WHEN (SELECT budget_id FROM categories WHERE category_id = NEW.category_id)
         != (SELECT budget_id FROM transactions WHERE transaction_id = NEW.transaction_id)
    THEN RAISE(ABORT, 'category and transaction budget mismatch on line update')
  END;
END;

-- Check transaction_tags: tag belongs to same budget as transaction
CREATE TRIGGER IF NOT EXISTS trg_tag_tx_budget_check
BEFORE INSERT ON transaction_tags
FOR EACH ROW
BEGIN
  SELECT CASE
    WHEN (SELECT budget_id FROM tags WHERE tag_id = NEW.tag_id)
         != (SELECT budget_id FROM transactions WHERE transaction_id = NEW.transaction_id)
    THEN RAISE(ABORT, 'tag and transaction budget mismatch')
  END;
END;

CREATE TRIGGER IF NOT EXISTS trg_tag_tx_budget_check_upd
BEFORE UPDATE OF tag_id, transaction_id ON transaction_tags
FOR EACH ROW
BEGIN
  SELECT CASE
    WHEN (SELECT budget_id FROM tags WHERE tag_id = NEW.tag_id)
         != (SELECT budget_id FROM transactions WHERE transaction_id = NEW.transaction_id)
    THEN RAISE(ABORT, 'tag and transaction budget mismatch on update')
  END;
END;

--------------------------------------------------------------------------------
-- Keep transactions.amount = SUM(transaction_lines.amount)
-- (lines are authoritative; header is auto-updated)
--------------------------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS trg_lines_after_insert_sum
AFTER INSERT ON transaction_lines
FOR EACH ROW
BEGIN
  UPDATE transactions
    SET amount = COALESCE((SELECT SUM(amount) FROM transaction_lines WHERE transaction_id = NEW.transaction_id), 0)
    WHERE transaction_id = NEW.transaction_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_lines_after_update_sum
AFTER UPDATE ON transaction_lines
FOR EACH ROW
BEGIN
  UPDATE transactions
    SET amount = COALESCE((SELECT SUM(amount) FROM transaction_lines WHERE transaction_id = NEW.transaction_id), 0)
    WHERE transaction_id = NEW.transaction_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_lines_after_delete_sum
AFTER DELETE ON transaction_lines
FOR EACH ROW
BEGIN
  UPDATE transactions
    SET amount = COALESCE((SELECT SUM(amount) FROM transaction_lines WHERE transaction_id = OLD.transaction_id), 0)
    WHERE transaction_id = OLD.transaction_id;
END;

--------------------------------------------------------------------------------
-- DELTA TRIGGERS: incrementally update accounts.balance (fast)
--------------------------------------------------------------------------------
-- 1) Insert a line: add NEW.amount to the account for that transaction
CREATE TRIGGER IF NOT EXISTS trg_line_insert_adjust_account_balance
AFTER INSERT ON transaction_lines
FOR EACH ROW
BEGIN
  UPDATE accounts
  SET balance = COALESCE(balance, 0) + NEW.amount
  WHERE account_id = (
    SELECT account_id FROM transactions WHERE transaction_id = NEW.transaction_id
  );
END;

-- 2) Delete a line: subtract OLD.amount from the account
CREATE TRIGGER IF NOT EXISTS trg_line_delete_adjust_account_balance
AFTER DELETE ON transaction_lines
FOR EACH ROW
BEGIN
  UPDATE accounts
  SET balance = COALESCE(balance, 0) - OLD.amount
  WHERE account_id = (
    SELECT account_id FROM transactions WHERE transaction_id = OLD.transaction_id
  );
END;

-- 3) Update a line: handle amount change or moving to different transaction/account
CREATE TRIGGER IF NOT EXISTS trg_line_update_adjust_account_balance
AFTER UPDATE ON transaction_lines
FOR EACH ROW
BEGIN
  -- Case A: same account -> apply delta
  UPDATE accounts
  SET balance = COALESCE(balance,0) + (NEW.amount - OLD.amount)
  WHERE account_id = (
    SELECT account_id FROM transactions WHERE transaction_id = NEW.transaction_id
  )
  AND (
    (SELECT account_id FROM transactions WHERE transaction_id = NEW.transaction_id)
    =
    (SELECT account_id FROM transactions WHERE transaction_id = OLD.transaction_id)
  );

  -- Case B: moved between different accounts -> subtract OLD.amount from old account
  UPDATE accounts
  SET balance = COALESCE(balance,0) - OLD.amount
  WHERE account_id = (
    SELECT account_id FROM transactions WHERE transaction_id = OLD.transaction_id
  )
  AND (
    (SELECT account_id FROM transactions WHERE transaction_id = NEW.transaction_id)
    !=
    (SELECT account_id FROM transactions WHERE transaction_id = OLD.transaction_id)
  );

  -- Case C: moved to a different account -> add NEW.amount to new account
  UPDATE accounts
  SET balance = COALESCE(balance,0) + NEW.amount
  WHERE account_id = (
    SELECT account_id FROM transactions WHERE transaction_id = NEW.transaction_id
  )
  AND (
    (SELECT account_id FROM transactions WHERE transaction_id = NEW.transaction_id)
    !=
    (SELECT account_id FROM transactions WHERE transaction_id = OLD.transaction_id)
  );
END;

-- 4) Transaction account change: move whole transaction total from old -> new
CREATE TRIGGER IF NOT EXISTS trg_transaction_account_move_lines
AFTER UPDATE OF account_id ON transactions
FOR EACH ROW
WHEN (OLD.account_id IS NOT NEW.account_id)
BEGIN
  UPDATE accounts
  SET balance = COALESCE(balance, 0) - COALESCE((
    SELECT SUM(amount) FROM transaction_lines WHERE transaction_id = NEW.transaction_id
  ), 0)
  WHERE account_id = OLD.account_id AND OLD.account_id IS NOT NULL;

  UPDATE accounts
  SET balance = COALESCE(balance, 0) + COALESCE((
    SELECT SUM(amount) FROM transaction_lines WHERE transaction_id = NEW.transaction_id
  ), 0)
  WHERE account_id = NEW.account_id AND NEW.account_id IS NOT NULL;
END;

--------------------------------------------------------------------------------
-- RECONCILIATION / FULL RECALC trigger
-- Insert into recalc_requests to recompute all account balances from transaction_lines.
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recalc_requests (
  request_id INTEGER PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_recalc_on_request
AFTER INSERT ON recalc_requests
FOR EACH ROW
BEGIN
  -- Recompute all account balances from transactions + lines (authoritative)
  UPDATE accounts
  SET balance = COALESCE((
    SELECT SUM(l.amount)
    FROM transactions t
    JOIN transaction_lines l ON l.transaction_id = t.transaction_id
    WHERE t.account_id = accounts.account_id
  ), 0);
END;

-- For charts showcase

-- Sample accounts
INSERT OR IGNORE INTO accounts (account_id, budget_id, name, currency, balance) VALUES
(1, 1, 'Checking Account', 'USD', 200000);  -- $2000.00 in cents

-- Sample categories
INSERT OR IGNORE INTO categories (category_id, budget_id, name, type) VALUES
(1, 1, 'Groceries', 'expense'),
(2, 1, 'Transportation', 'expense'),
(3, 1, 'Dining Out', 'expense'),
(4, 1, 'Salary', 'income'),
(5, 1, 'Utilities', 'expense'),
(6, 1, 'Entertainment', 'expense');

-- Sample payees
INSERT OR IGNORE INTO payees (payee_id, budget_id, name) VALUES
(1, 1, 'Supermarket'),
(2, 1, 'Gas Station'),
(3, 1, 'Restaurant'),
(4, 1, 'Employer'),
(5, 1, 'Electric Company'),
(6, 1, 'Internet Provider');

-- Sample tags
INSERT OR IGNORE INTO tags (tag_id, budget_id, name) VALUES
(1, 1, 'Essential'),
(2, 1, 'Discretionary'),
(3, 1, 'Monthly Bill');

-- Sample transactions (amounts in cents)
INSERT OR IGNORE INTO transactions (transaction_id, budget_id, account_id, payee_id, date, amount, notes, type) VALUES
(1, 1, 1, 1, '2025-09-15', -15000, 'Weekly grocery shopping', 'expense'),
(2, 1, 1, 2, '2025-09-18', -4500, 'Gas for car', 'expense'),
(3, 1, 1, 3, '2025-09-20', -8000, 'Dinner out', 'expense'),
(4, 1, 1, 4, '2025-09-22', 250000, 'Monthly salary', 'income'),
(5, 1, 1, 5, '2025-09-25', -12000, 'Electric bill', 'expense'),
(6, 1, 1, 6, '2025-09-28', -6000, 'Internet bill', 'expense'),
(7, 1, 1, 1, '2025-09-30', -18000, 'Monthly grocery shopping', 'expense'),
(8, 1, 1, 3, '2025-10-01', -6500, 'Lunch meeting', 'expense');

-- Transaction lines (matching the transactions above, amounts in cents)
INSERT OR IGNORE INTO transaction_lines (transaction_id, category_id, amount, line_order) VALUES
(1, 1, -15000, 1),   -- Groceries
(2, 2, -4500, 1),    -- Transportation
(3, 3, -8000, 1),    -- Dining Out
(4, 4, 250000, 1),   -- Salary
(5, 5, -12000, 1),   -- Utilities
(6, 5, -6000, 1),    -- Utilities
(7, 1, -18000, 1),   -- Groceries
(8, 3, -6500, 1);    -- Dining Out

-- Transaction tags
INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES
(1, 1),  -- Groceries = Essential
(2, 1),  -- Gas = Essential
(3, 2),  -- Dining = Discretionary
(5, 3),  -- Electric = Monthly Bill
(6, 3),  -- Internet = Monthly Bill
(7, 1);  -- Groceries = Essential

-- End of schema
