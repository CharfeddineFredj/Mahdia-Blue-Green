function uidStr(id) {
  return String(id);
}

function isUserRegistered(eventData, userId) {
  if (!eventData) return false;
  const u = uidStr(userId);
  if ((eventData.registeredUsers || []).some((id) => String(id) === u)) return true;
  return (eventData.eventRegistrations || []).some((r) => String(r.user) === u);
}

function addRegistration(eventData, userId, phone, address) {
  if (!eventData.eventRegistrations) eventData.eventRegistrations = [];
  if (!eventData.registeredUsers) eventData.registeredUsers = [];
  eventData.registeredUsers.push(userId);
  eventData.eventRegistrations.push({
    user: userId,
    phone: String(phone || '').trim(),
    address: String(address || '').trim(),
    registeredAt: new Date(),
  });
}

function removeRegistration(eventData, userId) {
  const u = uidStr(userId);
  const idx = (eventData.registeredUsers || []).findIndex((id) => String(id) === u);
  if (idx !== -1) eventData.registeredUsers.splice(idx, 1);
  const regs = eventData.eventRegistrations || [];
  const ri = regs.findIndex((r) => String(r.user) === u);
  if (ri !== -1) regs.splice(ri, 1);
}

module.exports = { isUserRegistered, addRegistration, removeRegistration };
