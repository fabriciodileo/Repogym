export type AccessGatewayResponse = {
  command: 'OPEN_GATE' | 'KEEP_CLOSED';
  delivered: boolean;
  simulated: boolean;
  detail: string;
};

export interface AccessGateway {
  grantAccess(deviceCode?: string): Promise<AccessGatewayResponse>;
  denyAccess(reason: string, deviceCode?: string): Promise<AccessGatewayResponse>;
}

export class SimulatedAccessGateway implements AccessGateway {
  async grantAccess(deviceCode?: string): Promise<AccessGatewayResponse> {
    return {
      command: 'OPEN_GATE',
      delivered: true,
      simulated: true,
      detail: `Apertura simulada${deviceCode ? ` en ${deviceCode}` : ''}`,
    };
  }

  async denyAccess(reason: string, deviceCode?: string): Promise<AccessGatewayResponse> {
    return {
      command: 'KEEP_CLOSED',
      delivered: true,
      simulated: true,
      detail: `${reason}${deviceCode ? ` (${deviceCode})` : ''}`,
    };
  }
}
