export const config: PrinterConfig = {
    name: 'Printer Ausschank',
    path: 'drinks', // drinks | food | *
    controlInterval: 20, // in seconds
    printerName: 'STAR_TSP143_AUSSCHANK'
};

export const printerKuecheConfig: PrinterConfig = {
    name: 'Printer Küche',
    path: 'food', // drinks | food | *
    controlInterval: 20, // in seconds
    printerName: 'STAR_TSP143_KUECHE'
};

export interface PrinterConfig {
    name: string,
    path: 'drinks' | 'food' | '*', // drinks | food | *
    controlInterval: number, // in seconds
    printerName: string
}