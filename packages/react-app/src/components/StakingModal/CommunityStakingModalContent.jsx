import React, { useState, useEffect } from "react";
import { Button, Modal, Input, Row, Col, notification } from "antd";
import { WarningOutlined, CheckOutlined } from "@ant-design/icons";
import { ethers } from "ethers";
import axios from "axios";
import AddressInput from "../AddressInput";
import DisplayAddressEns from "../DisplayAddressEns";

import { ERC20ABI } from "./utils";
import Loading from "../Loading";

// starting all stake amounts
const initialStakeAmounts = {
  0: "0",
  1: "0",
  2: "0",
  3: "0",
  4: "0",
  5: "0",
};

// starting all stake addresses
const initialStakeAddresses = {
  0: undefined,
  1: undefined,
  2: undefined,
  3: undefined,
  4: undefined,
  5: undefined,
};

export default function CommunityStakingModalContent({
  writeContracts,
  readContracts,
  tx,
  address,
  isModalVisible,
  setIsModalVisible,
  userSigner,
  round,
  mainnetProvider,
  targetNetwork,
}) {
  const [loading, setLoading] = useState(true);
  const [modalStatus, setModalStatus] = useState(1);
  const [numberOfCommunityStakes, setNumberOfCommunityStakes] = useState(1);
  const [allStakeAmounts, setAllStakeAmounts] = useState(initialStakeAmounts);
  const [allStakeAddresses, setAllStakeAddresses] = useState(initialStakeAddresses);

  /*
  Modal Status
  
  1) Not Approved
  2) Approving
  3) Ready To Stake
  4) Staking
  */

  // Sums up all the stake amounts entered on screen
  const getTotalAmountStaked = () => {
    const amounts = Object.values(allStakeAmounts);
    let total = 0;
    amounts.forEach(amount => {
      total += parseFloat(amount);
    });
    return total;
  };

  const getTotalNumberOfStakees = () => {
    const stakees = Object.values(allStakeAddresses);
    let total = 0;
    stakees.forEach(stakee => {
      if (stakee !== undefined) total++;
    });
    return total;
  };

  // Modal button should be hidden if user already approved tokens
  useEffect(() => {
    const refreshApprovalStatus = async () => {
      if (address && readContracts?.Token) {
        const readUpdate = readContracts?.Token;
        const decimals = await readUpdate?.decimals();
        const allowance = await readUpdate?.allowance(address, readContracts?.IDStaking?.address);
        const balance = await readUpdate?.balanceOf(address);

        const total = getTotalAmountStaked();
        const adjustedAmount = ethers.utils.parseUnits(total.toString() || "0", decimals);
        const hasEnoughAllowance = allowance.lt(adjustedAmount);

        if (balance.isZero()) {
          notification.open({
            message: "Not Enough Balance",
          });
        } else {
          if (allowance.isZero() || hasEnoughAllowance) {
            setModalStatus(1);
          } else {
            setModalStatus(3);
          }
        }

        setLoading(false);
      }
    };
    refreshApprovalStatus();
  }, [readContracts.Token, address]);

  const approveTokenAllowance = async () => {
    setModalStatus(2);
    await approve();
    setModalStatus(3);
  };

  const stakeUsers = async (id, amounts, users) => {
    let data = {};

    try {
      const res = await axios({
        method: "POST",
        url: "https://id-staking-passport-api.vercel.app/api/passport/reader",
        data: {
          address,
          domainChainId: targetNetwork.chainId,
        },
      });
      data = res.data;
    } catch (e) {
      notification.open({
        message: "Staking unsuccessful",
        description: `Error: ${e.message}`,
      });
      return null;
    }

    tx(writeContracts.IDStaking.stakeUsers(data.signature, data.nonce, data.timestamp, id + "", users, amounts));
  };

  // Allows the user to change stake amount
  const increaseStakeAmount = index => {
    const newStakeAmount = parseFloat(allStakeAmounts[index]) + 1.0;
    setAllStakeAmounts({
      ...allStakeAmounts,
      [index]: newStakeAmount.toString(),
    });
  };
  const decreaseStakeAmount = index => {
    const newStakeAmount = parseFloat(allStakeAmounts[index]) - 1.0;
    if (newStakeAmount >= 0) {
      setAllStakeAmounts({
        ...allStakeAmounts,
        [index]: newStakeAmount.toString(),
      });
    }
  };

  // This loads the address for stake amount displayed below the inputs
  const getStakeAddressAtIndex = index => {
    const addresslookup = allStakeAddresses[index];
    if (!addresslookup) return "unknown";
    let displayAddress = addresslookup?.substr(0, 5) + "..." + addresslookup?.substr(-4);
    return displayAddress;
  };

  // User approves usage of token
  const approve = async () => {
    await tx(writeContracts.Token.approve(readContracts.IDStaking.address, ethers.utils.parseUnits("10000000")));
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  // used to remove either address or amount from an index
  const removeItemAtIndex = (arrayOfVal, index, nullVal, initial) => {
    const allValues = Object.values(arrayOfVal);
    let newVal = [];

    // create new array of numbers
    if (index === 0) {
      allValues.shift();
      newVal = allValues.concat(nullVal);
    } else if (index === arrayOfVal.length) {
      allValues.pop();
      newVal = allValues.concat(nullVal);
    } else {
      const start = allValues.slice(0, index);
      const end = allValues.slice(index + 1, allValues.length);
      newVal = start.concat(end, nullVal);
    }

    // copy initial object to update
    const newValues = initial;

    // create new array objects
    newVal.forEach((amount, i) => {
      newValues[i] = amount;
    });

    return newValues;
  };

  return (
    <Modal
      title={<span className="font-libre-franklin">Stake on other people</span>}
      visible={isModalVisible}
      onCancel={handleCancel}
      okText={`Create a Passport`}
      footer={
        loading
          ? null
          : [
              <Button
                onClick={async () => await approveTokenAllowance()}
                hidden={modalStatus === 3 || modalStatus === 4}
                key="Approve GTC"
                loading={modalStatus === 2}
                className="rounded-sm rounded bg-purple-connectPurple py-2 px-10 text-white"
                style={{ backgroundColor: "#6F3FF5", color: "white" }}
              >
                Approve GTC
              </Button>,
              <Button
                loading={modalStatus === 4}
                onClick={async () => {
                  const amounts = Object.values(allStakeAmounts);
                  const addresses = Object.values(allStakeAddresses);
                  let canStake = true;

                  // filter amounts for 0
                  const filteredAmounts = amounts.filter(amount => parseFloat(amount) > 0);
                  // filter addresses for undefined
                  const filteredAddresses = addresses.filter(address => address !== undefined);

                  //Parse units on amounts
                  const parsedAmounts = [];
                  filteredAmounts.forEach(amount => {
                    parsedAmounts.push(ethers.utils.parseUnits(amount));
                  });

                  // Check if any of the addresses
                  filteredAddresses.forEach(filteredAddress => {
                    if (filteredAddress === address) {
                      canStake = false;
                      return notification.open({
                        message: "User Address found in Community Stake",
                        description: "Please remove your address as one of the staked address",
                        icon: <WarningOutlined style={{ color: "#FFA500" }} />,
                      });
                    }
                  });

                  // Final check before allowing user to stake
                  if (parsedAmounts.length === filteredAddresses.length && canStake) {
                    setModalStatus(4);
                    await stakeUsers(round.toString(), parsedAmounts, filteredAddresses);
                    setModalStatus(3);

                    // reset modal values
                    setAllStakeAddresses(initialStakeAddresses);
                    setAllStakeAmounts(initialStakeAmounts);

                    // close the modal
                    setIsModalVisible(false);
                  }
                }}
                disabled={modalStatus === 1 || getTotalAmountStaked() <= 0}
                key="Stake"
                style={{ backgroundColor: "#6F3FF5", color: "white" }}
              >
                Stake
              </Button>,
            ]
      }
    >
      {loading ? (
        <Loading />
      ) : (
        <>
          <p>Your stake amount (in GTC)</p>

          <div className="flex flex-col justify-center overflow--auto">
            <Row gutter={20} style={{ paddingBottom: "20px" }}>
              <Col span={12}>Address</Col>
              <Col span={12}>Amount(GTC)</Col>
            </Row>
            {[...Array(numberOfCommunityStakes)].map((_, i) => (
              <Row gutter={20} style={{ paddingTop: "10px", paddingBottom: "10px" }} key={i}>
                <Col className="gutter-row" span={12}>
                  <AddressInput
                    onChange={e => {
                      const tempAllAddresses = allStakeAddresses;
                      tempAllAddresses[i] = e;
                      setAllStakeAddresses(tempAllAddresses);
                    }}
                    ensProvider={mainnetProvider}
                    placeholder="Address of user"
                  />
                </Col>
                <Col className="gutter-row" span={10}>
                  <Button onClick={e => decreaseStakeAmount(i)}>-</Button>
                  <Input
                    style={{ width: "50%" }}
                    defaultValue={0}
                    value={allStakeAmounts[i]}
                    onChange={e => {
                      const newAmount = e.target.value;
                      setAllStakeAmounts({
                        ...allStakeAmounts,
                        [i]: newAmount,
                      });
                    }}
                  />
                  <Button onClick={e => increaseStakeAmount(i)}>+</Button>
                </Col>
                <Col className="gutter-row" span={2}>
                  <Button
                    style={{ border: "0px" }}
                    onClick={() => {
                      //Remove from allStakeAddresses
                      const tempAllAddresses = removeItemAtIndex(
                        allStakeAddresses,
                        i,
                        undefined,
                        initialStakeAddresses,
                      );
                      setAllStakeAddresses(tempAllAddresses);
                      //Remove from allStakeAmounts
                      const tempAllAmounts = removeItemAtIndex(allStakeAmounts, i, "0", initialStakeAmounts);
                      setAllStakeAmounts(tempAllAmounts);
                      // Decrease number of stake inputs
                      setNumberOfCommunityStakes(numberOfCommunityStakes - 1);
                    }}
                  >
                    X
                  </Button>
                </Col>
              </Row>
            ))}
            <Row>
              <Col span={24}>
                <Button
                  onClick={() => {
                    if (numberOfCommunityStakes < 6) {
                      setNumberOfCommunityStakes(numberOfCommunityStakes + 1);
                    }
                  }}
                  block
                >
                  + Add Address
                </Button>
              </Col>
            </Row>

            {getTotalAmountStaked() > 0 && (modalStatus === 3 || modalStatus === 4) && (
              <>
                <p className="mt-4">
                  You’ll be staking a total of <span className="font-bold">{getTotalAmountStaked()} GTC</span> on{" "}
                  {getTotalNumberOfStakees()} people.
                </p>
                <ul className="ml-4 list-disc">
                  {[...Array(numberOfCommunityStakes)].map((_, i) => (
                    <li>
                      {`${allStakeAmounts[i]} GTC on `}
                      <DisplayAddressEns address={allStakeAddresses[i]} ensProvider={mainnetProvider} />
                    </li>
                  ))}
                </ul>
                <div className="border-2 border-gray-200 px-4 py-6 rounded-lg bg-yellow-200 mt-4">
                  <h1>Important!</h1>
                  <ul className="list-disc ml-4">
                    <li>
                      Your staked GTC will be locked when the grant round starts, and you will not be able to withdraw
                      it until after the round ends.
                    </li>
                    <li>
                      The staking contract has been checked by our engineering team, but it has not been audited by a
                      professional audit firm.
                    </li>
                  </ul>
                </div>
              </>
            )}
          </div>

          {modalStatus === 1 && (
            <div className="mt-4 border-2 border-blue-alertBorder px-4 py-6 rounded-md bg-blue-alertBg font-libre-franklin">
              In order to stake any GTC (self or community) on a Passport, you must first send a one-time transaction
              approving the use of your GTC with the Smart Contract. (This is standard for smart contract engagement,
              token approval must be stored on-chain.)
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
