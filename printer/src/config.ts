import { PrinterTypes } from 'node-thermal-printer';

export interface PrinterConfig {
  infrastructureId: number;
  deviceId: number;
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
  categories: number[] | null;
  lastPing: number | null;
}

export interface Printer {
  id: number;
  type: PrinterTypes;
  name: string;
  interface: string;
  controlInterval: number;
}
