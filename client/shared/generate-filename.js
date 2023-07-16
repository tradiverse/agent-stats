export function generateFilename(time = new Date()) {
    time.setMilliseconds(0);
    time.setSeconds(0);
    // 0 or 30 (2 per minute)
    time.setMinutes(Math.floor(time.getMinutes() / 10) * 10);
    return 'agents_' + time.toISOString() + '.json';
}