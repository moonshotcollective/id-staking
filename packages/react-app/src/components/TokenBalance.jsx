import { useTokenBalance } from "eth-hooks/erc/erc-20/useTokenBalance";
import React, { useState } from "react";

import { utils } from "ethers";

export default function TokenBalance({ contracts, name, address, balance, dollarMultiplier, img }) {
  const [dollarMode, setDollarMode] = useState(true);

  const tokenContract = contracts && contracts[name];
  const getBalance = useTokenBalance(contracts, address, 0);

  let floatBalance = parseFloat("0.00");

  let usingBalance = getBalance;

  if (typeof balance !== "undefined") {
    usingBalance = balance;
  }

  if (usingBalance) {
    const etherBalance = utils.formatEther(usingBalance);
    parseFloat(etherBalance).toFixed(2);
    floatBalance = parseFloat(etherBalance);
  }

  let displayBalance = floatBalance.toFixed(4);

  if (dollarMultiplier && dollarMode) {
    displayBalance = "$" + (floatBalance * dollarMultiplier).toFixed(2);
  }

  return (
    <span
      style={{
        verticalAlign: "middle",
        fontSize: 24,
        padding: 8,
        cursor: "pointer",
      }}
      className="flex flex-row"
      onClick={() => {
        setDollarMode(!dollarMode);
      }}
    >
      <img src={img} alt={name} className="mr-2 h-6" /> {displayBalance} {name}
    </span>
  );
}
