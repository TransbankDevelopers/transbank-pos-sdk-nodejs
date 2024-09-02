declare module "transbank-pos-sdk" {

    interface SaleResponse {
      functionCode: number;
      responseCode: number;
      commerceCode: number;
      terminalId: string;
      responseMessage: string | null;
      successful: boolean;
      ticket: string;
      authorizationCode: string | null;
      amount: number;
      last4Digits?: number | null;
      operationNumber: string;
      cardType: string;
      accountingDate: string;
      accountNumber: string;
      cardBrand: string;
      realDate: string;
      realTime: string;
      employeeId?: string;
      tip?: number | null;
      feeAmount?: string;
      feeNumber?: string;
      change?: string;
      sharesNumber?: string;
      sharesAmount?: string;
      voucher?: string[];
      shareType?: string;
      sharesTypeComment?: string;
    }
  
    interface POSIntegrado {
      closeDay(): Promise<{
        functionCode: number;
        responseCode: number;
        commerceCode: number;
        terminalId: string;
        responseMessage: string | null;
        successful: boolean;
      }>;
      getLastSale(): Promise<SaleResponse>;
      getTotals(): Promise<{
        functionCode: number;
        responseCode: number;
        txCount: number;
        txTotal: number;
        responseMessage: string | null;
        successful: boolean;
      }>;
      salesDetail(printOnPos?: boolean): Promise<SaleResponse[] | boolean>;
      refund(operationId: string): Promise<{
        functionCode: number;
        responseCode: number;
        commerceCode: number;
        terminalId: string;
        authorizationCode: string;
        operationId: string;
        responseMessage: string | null;
        successful: boolean;
      }>;
      changeToNormalMode(): Promise<void>;
      sale(amount: number, ticket: string, sendStatus?: boolean, callback?: Function | null): Promise<SaleResponse>;
      multicodeSale(amount: number, ticket: string, commerceCode?: string | null, sendStatus?: boolean, callback?: Function | null): Promise<SaleResponse>;
      saleDetailResponse(payload: string): SaleResponse;
      saleResponse(payload: string): SaleResponse;
    }
  
    interface POSAutoservicio {
      sale(amount: number, ticket: string, sendStatus?: boolean, sendVoucher?: boolean, callback?: Function | null): Promise<SaleResponse>;
      getLastSale(sendVoucher?: boolean): Promise<SaleResponse>;
      refund(): Promise<{
        functionCode: number;
        responseCode: number;
        commerceCode: number;
        terminalId: string;
        authorizationCode: string;
        operationId: string;
        responseMessage: string | null;
        successful: boolean;
      }>;
      closeDay(sendVoucher?: boolean): Promise<{
        functionCode: number;
        responseCode: number;
        commerceCode: number;
        terminalId: string;
        voucher?: string[];
        responseMessage: string | null;
        successful: boolean;
      }>;
      initialization(): Promise<void>;
      initializationResponse(): Promise<{
        functionCode: number;
        responseCode: number;
        transactionDate: number;
        transactionTime: string;
        responseMessage: string | null;
        successful: boolean;
      }>;
    }
  
    interface Transbank {
      POSIntegrado: POSIntegrado;
      POSAutoservicio: POSAutoservicio;
    }
  
    const transbank: Transbank;
    export default transbank;
  }
  