import "antd/dist/antd.css";
import { useBalance, useContractLoader, useGasPrice, useOnBlock, useUserProviderAndSigner } from "eth-hooks";
import { useExchangeEthPrice } from "eth-hooks/dapps/dex";
import React, { useCallback, useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import "./App.css";
import { Contract, ThemeSwitch } from "./components";
import { NETWORKS, ALCHEMY_KEY } from "./constants";
import externalContracts from "./contracts/external_contracts";
// contracts
import deployedContracts from "./contracts/hardhat_contracts.json";
import { Transactor, Web3ModalSetup } from "./helpers";
import { Admin, Home, Stakes, Subgraph, StakeDashboard } from "./views";
import { useStaticJsonRPC } from "./hooks";

// --- sdk import
import { PassportReader } from "@gitcoinco/passport-sdk-reader";

const { ethers } = require("ethers");

/// 📡 What chain are your contracts deployed to?
const initialNetwork = NETWORKS.goerli; // <------- select your target frontend network (localhost, rinkeby, xdai, mainnet)

// 😬 Sorry for all the console logging
const DEBUG = true;
const NETWORKCHECK = true;
const USE_BURNER_WALLET = true; // toggle burner wallet feature
const USE_NETWORK_SELECTOR = false;

const web3Modal = Web3ModalSetup();

// 🛰 providers
const providers = [
  "https://eth-mainnet.gateway.pokt.network/v1/lb/611156b4a585a20035148406",
  `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_KEY}`,
  // "https://rpc.scaffoldeth.io:48544",
];

function App(props) {
  // specify all the chains your app is available on. Eg: ['localhost', 'mainnet', ...otherNetworks ]
  // reference './constants.js' for other networks
  const networkOptions = [initialNetwork.name, "mainnet", "rinkeby", "goerli"];

  const [injectedProvider, setInjectedProvider] = useState();
  const [address, setAddress] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState(networkOptions[3]);
  const [passport, setPassport] = useState({});

  const targetNetwork = NETWORKS[selectedNetwork];

  // 🔭 block explorer URL
  const blockExplorer = targetNetwork.blockExplorer;

  // load all your providers
  const localProvider = useStaticJsonRPC([
    process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : targetNetwork.rpcUrl,
  ]);
  const mainnetProvider = useStaticJsonRPC(providers);

  if (DEBUG) console.log(`Using ${selectedNetwork} network`);

  // 🛰 providers
  if (DEBUG) console.log("📡 Connecting to Mainnet Ethereum");

  const logoutOfWeb3Modal = async () => {
    await web3Modal.clearCachedProvider();
    if (injectedProvider && injectedProvider.provider && typeof injectedProvider.provider.disconnect == "function") {
      await injectedProvider.provider.disconnect();
    }
    setTimeout(() => {
      window.location.reload();
    }, 1);
  };

  /* 💵 This hook will get the price of ETH from 🦄 Uniswap: */
  const price = useExchangeEthPrice(targetNetwork, mainnetProvider);

  /* 🔥 This hook will get the price of Gas from ⛽️ EtherGasStation */
  const gasPrice = useGasPrice(targetNetwork, "fast");
  // Use your injected provider from 🦊 Metamask or if you don't have it then instantly generate a 🔥 burner wallet.
  const userProviderAndSigner = useUserProviderAndSigner(injectedProvider, localProvider, USE_BURNER_WALLET);
  const userSigner = userProviderAndSigner.signer;

  // Update Passport on address change
  const reader = new PassportReader();

  useEffect(() => {
    async function getAddress() {
      if (userSigner) {
        const newAddress = await userSigner.getAddress();
        setAddress(newAddress);
        const newPassport = await reader.getPassport(newAddress);
        console.log("check it out ", newPassport, newAddress);
        setPassport(newPassport);
      } else {
        setPassport({});
      }
    }
    getAddress();
  }, [userSigner]);

  // You can warn the user if you would like them to be on a specific network
  const localChainId = localProvider && localProvider._network && localProvider._network.chainId;
  const selectedChainId =
    userSigner && userSigner.provider && userSigner.provider._network && userSigner.provider._network.chainId;

  // For more hooks, check out 🔗eth-hooks at: https://www.npmjs.com/package/eth-hooks

  // The transactor wraps transactions and provides notificiations
  const tx = Transactor(userSigner, gasPrice);

  // 🏗 scaffold-eth is full of handy hooks like this one to get your balance:
  const yourLocalBalance = useBalance(localProvider, address);

  // const contractConfig = useContractConfig();

  const contractConfig = { deployedContracts: deployedContracts || {}, externalContracts: externalContracts || {} };

  // Load in your local 📝 contract and read a value from it:
  const readContracts = useContractLoader(localProvider, contractConfig);

  // If you want to make 🔐 write transactions to your contracts, use the userSigner:
  const writeContracts = useContractLoader(userSigner, contractConfig, localChainId);

  // If you want to call a function on a new block
  useOnBlock(mainnetProvider, () => {
    console.log(`⛓ A new mainnet block is here: ${mainnetProvider._lastBlockNumber}`);
  });

  const loadWeb3Modal = useCallback(
    async result => {
      const provider = await web3Modal.connect();
      setInjectedProvider(new ethers.providers.Web3Provider(provider));

      provider.on("chainChanged", chainId => {
        console.log(`chain changed to ${chainId}! updating providers`);
        setInjectedProvider(new ethers.providers.Web3Provider(provider));
      });

      provider.on("accountsChanged", () => {
        console.log(`account changed!`);
        setInjectedProvider(new ethers.providers.Web3Provider(provider));
      });

      // Subscribe to session disconnection
      provider.on("disconnect", (code, reason) => {
        console.log(code, reason);
        logoutOfWeb3Modal();
      });
      // eslint-disable-next-line
    },
    [setInjectedProvider],
  );

  useEffect(() => {
    if (web3Modal.cachedProvider) {
      loadWeb3Modal();
    }
  }, [loadWeb3Modal]);

  const faucetAvailable = localProvider && localProvider.connection && targetNetwork.name.indexOf("local") !== -1;

  return (
    <div className="App">
      {/* <Menu style={{ textAlign: "center", marginTop: 20 }} selectedKeys={[location.pathname]} mode="horizontal">
        <Menu.Item key="/">
          <Link to="/">App Home</Link>
        </Menu.Item>
        <Menu.Item key="/admin">
          <Link to="/admin">Admin Control</Link>
        </Menu.Item>
        <Menu.Item key="/debug">
          <Link to="/debug">Debug Contracts</Link>
        </Menu.Item>
        <Menu.Item key="/subgraph">
          <Link to="/subgraph">Subgraph</Link>
        </Menu.Item>
      </Menu> */}

      <Routes>
        <Route
          path="/"
          element={
            <Home
              tx={tx}
              address={address}
              readContracts={readContracts}
              writeContracts={writeContracts}
              mainnetProvider={mainnetProvider}
              networkOptions={networkOptions}
              selectedNetwork={selectedNetwork}
              setSelectedNetwork={setSelectedNetwork}
              yourLocalBalance={yourLocalBalance}
              USE_NETWORK_SELECTOR={USE_NETWORK_SELECTOR}
              localProvider={localProvider}
              targetNetwork={targetNetwork}
              logoutOfWeb3Modal={logoutOfWeb3Modal}
              selectedChainId={selectedChainId}
              localChainId={localChainId}
              NETWORKCHECK={NETWORKCHECK}
              passport={passport}
              userSigner={userSigner}
              price={price}
              web3Modal={web3Modal}
              loadWeb3Modal={loadWeb3Modal}
              blockExplorer={blockExplorer}
            />
          }
        />

        <Route
          path="/StakeDashboard"
          element={
            <StakeDashboard
              tx={tx}
              address={address}
              readContracts={readContracts}
              writeContracts={writeContracts}
              mainnetProvider={mainnetProvider}
              networkOptions={networkOptions}
              selectedNetwork={selectedNetwork}
              setSelectedNetwork={setSelectedNetwork}
              yourLocalBalance={yourLocalBalance}
              USE_NETWORK_SELECTOR={USE_NETWORK_SELECTOR}
              localProvider={localProvider}
              targetNetwork={targetNetwork}
              logoutOfWeb3Modal={logoutOfWeb3Modal}
              selectedChainId={selectedChainId}
              localChainId={localChainId}
              NETWORKCHECK={NETWORKCHECK}
              passport={passport}
              userSigner={userSigner}
              price={price}
              web3Modal={web3Modal}
              loadWeb3Modal={loadWeb3Modal}
              blockExplorer={blockExplorer}
            />
          }
        />

        <Route
          path="/admin"
          element={
            <Admin
              tx={tx}
              address={address}
              readContracts={readContracts}
              writeContracts={writeContracts}
              mainnetProvider={mainnetProvider}
            />
          }
        />
        <Route
          path="/stake-log"
          element={
            <Stakes
              tx={tx}
              address={address}
              localProvider={localProvider}
              readContracts={readContracts}
              writeContracts={writeContracts}
              mainnetProvider={mainnetProvider}
            />
          }
        />

        <Route
          path="/debug"
          element={
            <div>
              <Contract
                name="Token"
                price={price}
                signer={userSigner}
                provider={localProvider}
                address={address}
                blockExplorer={blockExplorer}
                contractConfig={contractConfig}
              />
              <Contract
                name="IDStaking"
                price={price}
                signer={userSigner}
                provider={localProvider}
                address={address}
                blockExplorer={blockExplorer}
                contractConfig={contractConfig}
              />
            </div>
          }
        />

        <Route
          path="/subgraph"
          element={
            <Subgraph
              subgraphUri={props.subgraphUri}
              tx={tx}
              writeContracts={writeContracts}
              mainnetProvider={mainnetProvider}
            />
          }
        />
      </Routes>

      <ThemeSwitch />
    </div>
  );
}

export default App;
