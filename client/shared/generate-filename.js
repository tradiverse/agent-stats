/**
 * Generates a filename based on the provided time (Defaults to current time)
 * 
 * This function is used in the browser AND by the download script
 * 
 * @param {Date} time 
 * @returns string - filename to use for specified time
 */
export function generateFilename(time = new Date()) {
    time.setMilliseconds(0);
    time.setSeconds(0);
    // round to nearest 10 minutes before specified time
    time.setMinutes(Math.floor(time.getMinutes() / 10) * 10);
    return 'agents_' + time.toISOString() + '.json';
}