-- Function to increment claims count atomically
CREATE OR REPLACE FUNCTION increment_claims_count(deal_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE deals
  SET claims_count = claims_count + 1
  WHERE id = deal_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-expire deals
CREATE OR REPLACE FUNCTION expire_past_deals()
RETURNS VOID AS $$
BEGIN
  UPDATE deals
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get vendor analytics
CREATE OR REPLACE FUNCTION get_vendor_analytics(vendor_id_param UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_deals', (SELECT COUNT(*) FROM deals WHERE vendor_id = vendor_id_param),
    'active_deals', (SELECT COUNT(*) FROM deals WHERE vendor_id = vendor_id_param AND status = 'active'),
    'total_claims', (SELECT COALESCE(SUM(claims_count), 0) FROM deals WHERE vendor_id = vendor_id_param),
    'total_redemptions', (SELECT COUNT(*) FROM redemptions WHERE vendor_id = vendor_id_param),
    'total_views', 0,
    'conversion_rate', CASE
      WHEN (SELECT COALESCE(SUM(claims_count), 0) FROM deals WHERE vendor_id = vendor_id_param) > 0
      THEN ROUND(
        (SELECT COUNT(*)::NUMERIC FROM redemptions WHERE vendor_id = vendor_id_param) /
        (SELECT COALESCE(SUM(claims_count), 1) FROM deals WHERE vendor_id = vendor_id_param) * 100, 2
      )
      ELSE 0
    END
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
