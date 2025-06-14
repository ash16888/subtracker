-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL,
    billing_period TEXT NOT NULL CHECK (billing_period IN ('monthly', 'yearly')),
    next_payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    category TEXT,
    url TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for user_id for faster queries
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);

-- Create index for next_payment_date for sorting
CREATE INDEX idx_subscriptions_next_payment_date ON public.subscriptions(next_payment_date);

-- Enable Row Level Security
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see only their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate next payment date
CREATE OR REPLACE FUNCTION public.calculate_next_payment_date(
    payment_date TIMESTAMP WITH TIME ZONE,
    billing_period TEXT
)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
    IF billing_period = 'monthly' THEN
        RETURN payment_date + INTERVAL '1 month';
    ELSIF billing_period = 'yearly' THEN
        RETURN payment_date + INTERVAL '1 year';
    ELSE
        RETURN payment_date;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON public.subscriptions TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;