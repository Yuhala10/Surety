-- Add wallet transactions table for tracking deposits/withdrawals
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    type VARCHAR(50), -- DEPOSIT, WITHDRAWAL
    amount DECIMAL(15,2) NOT NULL,
    reference VARCHAR(255), -- Campay reference
    phone VARCHAR(20),
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, COMPLETED, FAILED
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_reference ON wallet_transactions(reference);
CREATE INDEX idx_wallet_transactions_status ON wallet_transactions(status);
