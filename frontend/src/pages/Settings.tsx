import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Save, 
  Key, 
  Database, 
  Download, 
  CheckCircle, 
  AlertCircle 
} from 'lucide-react';
import { api, BusinessSettings } from '../lib/api';

export default function Settings() {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  
  // Profile Form States
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  
  // Bank Form States
  const [bankAccName, setBankAccName] = useState('');
  const [bankAccNum, setBankAccNum] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankName, setBankName] = useState('');
  const [upiId, setUpiId] = useState('');
  
  // Sequence Form States
  const [currency, setCurrency] = useState('INR');
  const [taxLabel, setTaxLabel] = useState('GST');
  const [defaultTaxRate, setDefaultTaxRate] = useState(0);
  const [invoicePrefix, setInvoicePrefix] = useState('INV-');
  const [invoiceNextNum, setInvoiceNextNum] = useState(1);
  const [invoiceReset, setInvoiceReset] = useState<'never' | 'calendar_year' | 'financial_year'>('financial_year');
  const [defaultTermsDays, setDefaultTermsDays] = useState(15);
  const [defaultNotes, setDefaultNotes] = useState('');
  const [defaultTerms, setDefaultTerms] = useState('');

  // Password Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI Statuses
  const [loading, setLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const fetchSettings = async () => {
    try {
      const res = await api.settings.get();
      setSettings(res);
      
      // Populate fields
      setBusinessName(res.business_name);
      setOwnerName(res.owner_name || '');
      setEmail(res.email || '');
      setPhone(res.phone || '');
      setAddress(res.address || '');
      setGstin(res.gstin || '');
      setPan(res.pan || '');
      
      setBankAccName(res.bank_account_name || '');
      setBankAccNum(res.bank_account_number || '');
      setBankIfsc(res.bank_ifsc || '');
      setBankName(res.bank_name || '');
      setUpiId(res.upi_id || '');
      
      setCurrency(res.currency);
      setTaxLabel(res.tax_label);
      setDefaultTaxRate(res.default_tax_rate);
      setInvoicePrefix(res.invoice_prefix);
      setInvoiceNextNum(res.invoice_next_number);
      setInvoiceReset(res.invoice_number_reset);
      setDefaultTermsDays(res.default_payment_terms_days);
      setDefaultNotes(res.default_notes || '');
      setDefaultTerms(res.default_terms || '');
    } catch (err: any) {
      setSettingsError(err.message || 'Failed to fetch settings profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsSuccess('');
    setSettingsError('');

    if (!businessName.trim()) {
      setSettingsError('Business Name is required.');
      setSettingsSaving(false);
      return;
    }

    try {
      await api.settings.update({
        business_name: businessName,
        owner_name: ownerName || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        gstin: gstin || null,
        pan: pan || null,
        bank_account_name: bankAccName || null,
        bank_account_number: bankAccNum || null,
        bank_ifsc: bankIfsc || null,
        bank_name: bankName || null,
        upi_id: upiId || null,
        currency,
        tax_label: taxLabel,
        default_tax_rate: defaultTaxRate,
        invoice_prefix: invoicePrefix,
        invoice_next_number: invoiceNextNum,
        invoice_number_reset: invoiceReset,
        default_payment_terms_days: defaultTermsDays,
        default_notes: defaultNotes || null,
        default_terms: defaultTerms || null
      });
      setSettingsSuccess('Business profile and settings updated successfully!');
      fetchSettings();
    } catch (err: any) {
      setSettingsError(err.message || 'Failed to update settings profile.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordSuccess('');
    setPasswordError('');

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      setPasswordSaving(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      setPasswordSaving(false);
      return;
    }

    try {
      await api.settings.changePassword({
        currentPassword,
        newPassword
      });
      setPasswordSuccess('Login password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change login password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const triggerExport = (entity: 'clients' | 'invoices' | 'purchase-orders') => {
    const url = api.settings.getExportUrl(entity);
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="font-display font-bold text-3xl text-white">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Configure business letterheads, billing sequences, and export database files</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: General Profile & Banks */}
        <div className="lg:col-span-2 space-y-8">
          <form onSubmit={handleSettingsSubmit} className="space-y-8">
            
            {/* Business Details */}
            <div className="glass-card p-6 md:p-8 rounded-2xl border-slate-800/80 space-y-6">
              <h2 className="font-display font-semibold text-lg text-white flex items-center space-x-2">
                <SettingsIcon className="h-5 w-5 text-sky-400" />
                <span>1. Business Letterhead & Info</span>
              </h2>

              {settingsError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-350 rounded-lg text-xs flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{settingsError}</span>
                </div>
              )}

              {settingsSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-350 rounded-lg text-xs flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>{settingsSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1.5 uppercase tracking-wider">Business / Trade Name *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Acme Studio"
                    className="w-full form-input text-sm" 
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1.5 uppercase tracking-wider">Owner / Proprietor Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. John Doe"
                    className="w-full form-input text-sm" 
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1.5 uppercase tracking-wider">Contact Email</label>
                  <input 
                    type="email" 
                    placeholder="billing@acme.com"
                    className="w-full form-input text-sm" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1.5 uppercase tracking-wider">Contact Phone</label>
                  <input 
                    type="text" 
                    placeholder="+91 99999 88888"
                    className="w-full form-input text-sm" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1.5 uppercase tracking-wider">Physical Address (Shown on Letterhead)</label>
                <textarea 
                  placeholder="Street details, State, Country, ZIP..." 
                  rows={3}
                  className="w-full form-input text-sm resize-none" 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1.5 uppercase tracking-wider">India GSTIN (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 27AAAAA1111A1Z1"
                    className="w-full form-input text-sm font-mono uppercase" 
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1.5 uppercase tracking-wider">Permanent Account Number (PAN)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. ABCDE1234F"
                    className="w-full form-input text-sm font-mono uppercase" 
                    value={pan}
                    onChange={(e) => setPan(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Bank Coordinates */}
            <div className="glass-card p-6 md:p-8 rounded-2xl border-slate-800/80 space-y-6">
              <h2 className="font-display font-semibold text-lg text-white flex items-center space-x-2">
                <Database className="h-5 w-5 text-emerald-400" />
                <span>2. Remittance & Banking Details</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1.5 uppercase tracking-wider">Bank Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. HDFC Bank"
                    className="w-full form-input text-sm" 
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1.5 uppercase tracking-wider">Account Holder Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. John Doe Consulting"
                    className="w-full form-input text-sm" 
                    value={bankAccName}
                    onChange={(e) => setBankAccName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1.5 uppercase tracking-wider">Account Number</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 50100293849102"
                    className="w-full form-input text-sm font-mono" 
                    value={bankAccNum}
                    onChange={(e) => setBankAccNum(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1.5 uppercase tracking-wider">IFSC Routing Code</label>
                  <input 
                    type="text" 
                    placeholder="e.g. HDFC0000102"
                    className="w-full form-input text-sm font-mono uppercase" 
                    value={bankIfsc}
                    onChange={(e) => setBankIfsc(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1.5 uppercase tracking-wider">Direct UPI ID (e.g. GPay/PhonePe address)</label>
                <input 
                  type="text" 
                  placeholder="e.g. owner@okaxis"
                  className="w-full form-input text-sm font-mono" 
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                />
              </div>
            </div>

            {/* Sequence & Presets */}
            <div className="glass-card p-6 md:p-8 rounded-2xl border-slate-800/80 space-y-6">
              <h2 className="font-display font-semibold text-lg text-white flex items-center space-x-2">
                <Database className="h-5 w-5 text-indigo-400" />
                <span>3. Invoicing Sequences & Presets</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1.5 uppercase tracking-wider">Currency</label>
                  <select
                    className="w-full form-input text-sm"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1.5 uppercase tracking-wider">Tax Label Preset</label>
                  <input 
                    type="text" 
                    className="w-full form-input text-sm font-semibold uppercase" 
                    value={taxLabel}
                    onChange={(e) => setTaxLabel(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1.5 uppercase tracking-wider">Default Tax %</label>
                  <input 
                    type="number" 
                    className="w-full form-input text-sm font-mono text-right" 
                    value={defaultTaxRate}
                    onChange={(e) => setDefaultTaxRate(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1.5 uppercase tracking-wider">Invoice Prefix</label>
                  <input 
                    type="text" 
                    className="w-full form-input text-sm font-mono" 
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1.5 uppercase tracking-wider">Next Invoice Index</label>
                  <input 
                    type="number" 
                    className="w-full form-input text-sm font-mono" 
                    value={invoiceNextNum}
                    onChange={(e) => setInvoiceNextNum(parseInt(e.target.value, 10) || 1)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1.5 uppercase tracking-wider">Reset Trigger</label>
                  <select
                    className="w-full form-input text-sm"
                    value={invoiceReset}
                    onChange={(e) => setInvoiceReset(e.target.value as any)}
                  >
                    <option value="never">Never Reset Counter</option>
                    <option value="calendar_year">Reset Daily (Calendar Year)</option>
                    <option value="financial_year">Reset April (India Financial Year)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1.5 uppercase tracking-wider">Default Payment Term Days</label>
                <input 
                  type="number" 
                  className="w-full form-input text-sm font-mono max-w-xs" 
                  value={defaultTermsDays}
                  onChange={(e) => setDefaultTermsDays(parseInt(e.target.value, 10) || 0)}
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1.5 uppercase tracking-wider">Default Footer Terms & Conditions</label>
                  <textarea 
                    rows={2}
                    className="w-full form-input text-xs resize-none" 
                    value={defaultTerms}
                    onChange={(e) => setDefaultTerms(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1.5 uppercase tracking-wider">Default Notes (Remittances / Thanks)</label>
                  <textarea 
                    rows={2}
                    className="w-full form-input text-xs resize-none" 
                    value={defaultNotes}
                    onChange={(e) => setDefaultNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Profile Action button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={settingsSaving}
                className="bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white font-semibold py-2.5 px-6 rounded-lg flex items-center space-x-2 shadow-lg shadow-sky-500/10 cursor-pointer disabled:opacity-50 transition-colors"
              >
                <Save className="h-4.5 w-4.5" />
                <span>{settingsSaving ? 'Saving Configurations...' : 'Save Settings'}</span>
              </button>
            </div>

          </form>
        </div>

        {/* Right Side: Password Reset & Offline backups */}
        <div className="space-y-8">
          
          {/* Change password */}
          <div className="glass-card p-6 rounded-2xl border-slate-800/80 space-y-5">
            <h2 className="font-display font-semibold text-base text-white flex items-center space-x-2">
              <Key className="h-4.5 w-4.5 text-sky-400" />
              <span>Change Login Password</span>
            </h2>

            {passwordError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-350 rounded-lg text-xs">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-350 rounded-lg text-xs">
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1.5">Current Password</label>
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  className="w-full form-input text-xs" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1.5">New Password</label>
                <input 
                  type="password" 
                  required
                  placeholder="Min 6 characters"
                  className="w-full form-input text-xs" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1.5">Confirm New Password</label>
                <input 
                  type="password" 
                  required
                  placeholder="Confirm password"
                  className="w-full form-input text-xs" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={passwordSaving}
                className="w-full py-2 bg-slate-800 hover:bg-slate-750 border border-slate-750 text-slate-200 text-xs font-semibold rounded cursor-pointer transition-colors"
              >
                {passwordSaving ? 'Updating...' : 'Change Password'}
              </button>
            </form>
          </div>

          {/* Backup exports box */}
          <div className="glass-card p-6 rounded-2xl border-slate-800/80 space-y-5">
            <h2 className="font-display font-semibold text-base text-white flex items-center space-x-2">
              <Database className="h-4.5 w-4.5 text-indigo-400" />
              <span>Offsite Data Backups</span>
            </h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              Export all business files locally in standard `.csv` spreadsheets. Highly recommended for offline records and data recovery.
            </p>

            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => triggerExport('clients')}
                className="w-full flex items-center justify-between px-4 py-2.5 border border-slate-800 bg-slate-900/30 hover:bg-slate-900/80 rounded text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <span>Export Clients (CSV)</span>
                <Download className="h-4 w-4 text-slate-500" />
              </button>
              <button
                onClick={() => triggerExport('invoices')}
                className="w-full flex items-center justify-between px-4 py-2.5 border border-slate-800 bg-slate-900/30 hover:bg-slate-900/80 rounded text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <span>Export Invoices (CSV)</span>
                <Download className="h-4 w-4 text-slate-500" />
              </button>
              <button
                onClick={() => triggerExport('purchase-orders')}
                className="w-full flex items-center justify-between px-4 py-2.5 border border-slate-800 bg-slate-900/30 hover:bg-slate-900/80 rounded text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <span>Export Purchase Orders (CSV)</span>
                <Download className="h-4 w-4 text-slate-500" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
