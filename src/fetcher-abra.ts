//import abi from './abi';
import abi from './artifacts/bigabi.json'
import LRU from 'lru-cache';
import BigNumber from 'bignumber.js';

type BlockId = string | number;
type CacheValues = string[] | BigNumber;

// Using one Cauldron for initial proof of concept
const yvWETHv2Cauldron: string = "0x920D9BD936Da4eAFb5E25c6bDC9f6CB528953F9f";

export default class DataFetcher {
    private cache: LRU<string, CacheValues>;
    private web3: any;

    constructor(web3: any) {
        this.cache = new LRU<string, CacheValues>({max: 10_000});
        this.web3 = web3;
    }

    // Ideal way to set this up is as it is done in the Yearn Deposit/Withdraw Agent with many *Cauldrons* in an array
    public async getCauldron(provider: string, block: BlockId = "latest"): Promise<string[]> {

        const cacheKey: string = `${block}-${provider}-1`;
        if(block !== "latest" && this.cache.get(cacheKey) !== undefined)
            return this.cache.get(cacheKey) as string[];
        const cauldronContract = new this.web3.eth.Contract(abi, yvWETHv2Cauldron);
        const cauldrons: string[] = await cauldronContract.methods
            .assetsAddresses()
            .call({}, block);
        const cauldronsInLower: string[] = cauldrons.map((v: string) => v.toLowerCase());
        this.cache.set(cacheKey, cauldronsInLower);
        return cauldronsInLower;
    }

    public async getMaxDeposit(yvWETHv2Cauldron: string, block: BlockId = "latest"): Promise<BigNumber> {
        const cacheKey: string = `${block}-${yvWETHv2Cauldron}-2`;
        if(block !== "latest" && this.cache.get(cacheKey) !== undefined)
            return this.cache.get(cacheKey) as BigNumber;

        const vaultContract = new this.web3.eth.Contract(abi, yvWETHv2Cauldron);

        const [
            depositLimit,
            token,
            debt,
        ] = await Promise.all([
            vaultContract.methods.depositLimit().call({}, block),
            vaultContract.methods.token().call({}, block),
            vaultContract.methods.totalDebt().call({}, block),
        ]);

        const tokenContract = new this.web3.eth.Contract(abi.TOKEN, token);

        const balance: BigNumber = new BigNumber(
            await tokenContract.methods
                .balanceOf(vault)
                .call({}, block)
        );

        const maxDeposit: BigNumber = (new BigNumber(depositLimit)).minus(balance).minus(new BigNumber(debt));
        this.cache.set(cacheKey, maxDeposit);
        return maxDeposit;
    }

    public async getMaxWithdraw(vault: string, block: BlockId = "latest"): Promise<BigNumber> {
        const cacheKey: string = `${block}-${vault}-3`;
        if(block !== "latest" && this.cache.get(cacheKey) !== undefined)
            return this.cache.get(cacheKey) as BigNumber;

        const vaultContract = new this.web3.eth.Contract(abi.VAULT, vault);

        const supply: BigNumber = new BigNumber(
            await vaultContract.methods
                .totalSupply()
                .call({}, block)
        );

        this.cache.set(cacheKey, supply);
        return supply;
    }
};
