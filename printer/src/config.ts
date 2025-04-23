import { PrinterTypes } from 'node-thermal-printer';

export interface PrinterConfig {
  printerType: PrinterTypes;
  name: string;
  categories: number[];
  controlInterval: number; // in seconds
  printerName: string;
  interface: string;
}

export interface InfrastructureConfigDTO {
  id: number;
  printer: Printer;
  categories: number[];
  lastPing: number;
}

export interface Printer {
  id: number;
  type: PrinterTypes;
  name: string;
  interface: string;
  controlInterval: number;
}
