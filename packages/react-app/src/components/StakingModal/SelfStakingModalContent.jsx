import React, { useState, useEffect } from "react";
import { Button, Modal, Input, notification } from "antd";
import { ethers } from "ethers";
import Loading from "../Loading";

export default function CommunityStakingModalContent({
  writeContracts,
  readContracts,
  tx,
  address,
  isModalVisible,
  setIsModalVisible,
  round,
}) {
  const [stakeAmount, setStakeAmount] = useState("0");
  const [modalStatus, setModalStatus] = useState(1);
  const [loading, setLoading] = useState(true);

  /*
  Modal Status
  
  1) Not Approved
  2) Approving
  3) Ready To Stake
  4) Staking
  */

  const approveTokenAllowance = async () => {
    setModalStatus(2);
    await approve();
    setModalStatus(3);
  };

  const stake = async (id, amount) => {
    tx(writeContracts.IDStaking.stake(id + "", ethers.utils.parseUnits(amount)));
  };

  // Modal button should be hidden if user already approved tokens
  useEffect(() => {
    const refreshApprovalStatus = async () => {
      if (address && readContracts?.Token) {
        const readUpdate = readContracts?.Token;
        const decimals = await readUpdate?.decimals();
        const allowance = await readUpdate?.allowance(address, readContracts?.IDStaking?.address);
        const balance = await readUpdate?.balanceOf(address);

        const adjustedAmount = ethers.utils.parseUnits(stakeAmount.toString() || "0", decimals);
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

  // Allows the user to change stake amount
  const increaseStakeAmount = () => {
    const newStakeAmount = parseFloat(stakeAmount) + 1.0;
    setStakeAmount(newStakeAmount.toString());
  };
  const decreaseStakeAmount = () => {
    const newStakeAmount = parseFloat(stakeAmount) - 1.0;
    if (newStakeAmount >= 0) {
      setStakeAmount(newStakeAmount.toString());
    }
  };

  // User approves usage of token
  const approve = async () => {
    await tx(writeContracts.Token.approve(readContracts.IDStaking.address, ethers.utils.parseUnits("10000000")));
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  return (
    <Modal
      title={<span className="font-libre-franklin">Stake on yourself</span>}
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
                disabled={loading}
                key="Approve GTC"
                loading={modalStatus === 2}
                className="rounded-sm rounded bg-purple-connectPurple py-2 px-10 text-white"
                style={{ backgroundColor: "#6F3FF5", color: "white" }}
              >
                Approve GTC
              </Button>,
              <Button
                onClick={async () => {
                  setModalStatus(4);
                  try {
                    await stake(round.toString(), stakeAmount.toString());
                  } catch (e) {
                    notification.open({
                      message: "Staking unsuccessful",
                      description: `Error: ${e.message}`,
                    });
                    return null;
                  }
                  setModalStatus(3);

                  // reset modal values
                  setStakeAmount("0");

                  // close the modal
                  setIsModalVisible(false);
                }}
                disabled={loading || modalStatus === 1 || !(parseFloat(stakeAmount) > 0)}
                loading={modalStatus === 4}
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
          <div>
            <div className="flex flex-row justify-center">
              <Button onClick={() => decreaseStakeAmount()}>-</Button>
              <Input
                value={stakeAmount}
                onChange={e => setStakeAmount(e.target.value)}
                style={{ borderRight: "0px", borderLeft: "0px", maxWidth: "30%" }}
              />
              <Button onClick={() => increaseStakeAmount()}>+</Button>
            </div>
            {parseFloat(stakeAmount) > 0 && (modalStatus === 3 || modalStatus === 4) && (
              <>
                <p className="mt-4">
                  You’ll be staking <span className="font-bold">{stakeAmount} GTC</span> on yourself.
                </p>
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
