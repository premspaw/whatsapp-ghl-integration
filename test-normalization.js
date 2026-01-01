const whatsappSync = require('./src/services/sync/whatsappToGHL');

function test(phone) {
    const normalized = whatsappSync.normalizePhone(phone);
    console.log(`Input: ${phone} -> Normalized: ${normalized}`);
}

const testNumbers = [
    '9181213133382@c.us',
    '81213133382@c.us',
    '081213133382@c.us',
    '+9181213133382',
    '81213133382'
];

testNumbers.forEach(test);
