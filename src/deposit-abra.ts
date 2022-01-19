import {
    Finding,
    FindingSeverity,
    FindingType,
    HandleTransaction,
} from 'forta-agent';
import BigNumber from 'bignumber.js';
import { decodeParameter, provideFunctionCallsDetectorHandler } from 'forta-agent-tools';


export const LOGADDCOLLATERAL_SIGNATURE: string = "LogAddCollateral(address,address,uint256)";


const createFinding = (metadata: any): Finding => {
    const output: BigNumber = new BigNumber(decodeParameter('uint256', metadata?.output));

    return Finding.fromObject({
        name: "Abracadabra Cauldron Deposit",
        description: "Large deposit detected",
        alertId: "Abracadabra-1-1",
        type: FindingType.Info,
        severity: FindingSeverity.Info,
        protocol: "Abracadabra",
        metadata: {
            To: metadata?.to,
            From: metadata?.from,
            //To: metadata?.arguments[1].toLowerCase(),
            Amount: output.toString(),
        },
    });
};


const provideOutputFilter = (value: BigNumber) =>
    (output: string) => {
        const shares: BigNumber = new BigNumber(decodeParameter("uint256", output));
        return shares.gte(value);
    };


const provideLargeDepositDetector = (cauldronAddr: string, largeAmout: BigNumber): HandleTransaction =>
    provideFunctionCallsDetectorHandler(
        createFinding,
        LOGADDCOLLATERAL_SIGNATURE,
        { to: cauldronAddr, filterOnOutput: provideOutputFilter(largeAmout) },
    );


export default {
    provideLargeDepositDetector,
    createFinding,
    LOGADDCOLLATERAL_SIGNATURE: LOGADDCOLLATERAL_SIGNATURE,
};
