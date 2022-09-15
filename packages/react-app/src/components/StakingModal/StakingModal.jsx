import React from "react";
import SelfStakingModalContent from "./SelfStakingModalContent";
import CommunityStakingModalContent from "./CommunityStakingModalContent";

export default function StakingModal({
  isModalVisible,
  setIsModalVisible,
  stakingType,
  writeContracts,
  readContracts,
  tx,
  address,
  userSigner,
  round,
  mainnetProvider,
  targetNetwork,
}) {
  return (
    <div>
      {stakingType === "self" && (
        <SelfStakingModalContent
          writeContracts={writeContracts}
          readContracts={readContracts}
          tx={tx}
          address={address}
          isModalVisible={isModalVisible}
          setIsModalVisible={setIsModalVisible}
          userSigner={userSigner}
          round={round}
        />
      )}
      {stakingType === "community" && (
        <CommunityStakingModalContent
          writeContracts={writeContracts}
          readContracts={readContracts}
          tx={tx}
          address={address}
          isModalVisible={isModalVisible}
          setIsModalVisible={setIsModalVisible}
          userSigner={userSigner}
          round={round}
          mainnetProvider={mainnetProvider}
          targetNetwork={targetNetwork}
        />
      )}
    </div>
  );
}
