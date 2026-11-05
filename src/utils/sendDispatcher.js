// Direct Message Dispatcher for BIAI CRM
// Opens WhatsApp Web, Phone Dialer, Facebook Messenger, or Email client with reply copied/pre-filled.

import { formatBDPhoneForWhatsApp } from '../lib/phone.js';

export function getPrimarySendAction(lead, replyText = '') {
  const text = replyText || lead?.suggestedReply || '';
  const encodedText = encodeURIComponent(text);
  const waPhone = formatBDPhoneForWhatsApp(lead?.phone);

  if (lead?.channel === 'WhatsApp' || (waPhone && lead?.channel !== 'Phone call note')) {
    return {
      label: waPhone ? 'Send on WhatsApp' : 'Copy & Open WhatsApp',
      shortLabel: 'WhatsApp',
      appName: 'WhatsApp Web',
      colorClass: 'bg-[#059669] hover:bg-[#047857] text-white',
      url: waPhone
        ? `https://wa.me/${waPhone}?text=${encodedText}`
        : `https://wa.me/?text=${encodedText}`
    };
  }

  if (lead?.channel === 'Phone call note' && waPhone) {
    return {
      label: 'Send via WhatsApp / Call',
      shortLabel: 'WA / Call',
      appName: 'WhatsApp / Dialer',
      colorClass: 'bg-[#0067FF] hover:bg-[#0055D4] text-white',
      url: `https://wa.me/${waPhone}?text=${encodedText}`,
      telUrl: `tel:${lead.phone}`
    };
  }

  if (lead?.channel === 'Facebook Messenger' || lead?.channel === 'Facebook comment') {
    return {
      label: 'Copy Reply & Open FB',
      shortLabel: 'Copy & Open FB',
      appName: 'Facebook (Reply Copied)',
      colorClass: 'bg-[#0067FF] hover:bg-[#0055D4] text-white',
      url: 'https://www.facebook.com/messages/t/'
    };
  }

  return {
    label: 'Send Reply via Email',
    shortLabel: 'Send Email',
    appName: 'Email Client',
    colorClass: 'bg-[#0067FF] hover:bg-[#0055D4] text-white',
    url: `mailto:?subject=${encodeURIComponent('Regarding your BIAI AI Training Enquiry')}&body=${encodedText}`
  };
}

export function dispatchLeadReply(lead, replyText, onSentCallback) {
  const finalReply = (replyText || lead?.suggestedReply || '').trim();
  if (!finalReply) return;

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(finalReply).catch(() => {});
  }

  const action = getPrimarySendAction(lead, finalReply);
  if (typeof window !== 'undefined' && action.url) {
    window.open(action.url, '_blank', 'noopener,noreferrer');
  }

  if (onSentCallback) {
    onSentCallback(lead, finalReply, action.appName);
  }
}
