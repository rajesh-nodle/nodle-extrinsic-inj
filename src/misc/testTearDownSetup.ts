import ApiHandler from "./../ApiHandler";
import { ApiPromise } from "@polkadot/api";
import {
  SignedBlock,
  BlockHash,
  BlockAttestations,
} from "@polkadot/types/interfaces";
import { Keyring } from "@polkadot/keyring";
import { KeyringPair } from "@polkadot/keyring/types";
import { sleep } from "../util";

export const startTestSetup = async () => {
  //   const handler = await ApiHandler.create(["ws://172.28.1.1:9944"]);
//   const handler = await ApiHandler.create(["ws://localhost:9944"]);
  const handler = await ApiHandler.create(["ws://localhost:44190"]);

  const api = await handler.getApi();

  console.log(
    `{TestSetup::startTestSetup} handler ws://localhost:44190 is connected: ${handler.isConnected()}`
  );

  const keyring = new Keyring({ type: "sr25519" });

  const validator_bond_const = 20000000000000;
  const nominator_bond_const = 10000000000000;

  const validators = [
    {
      name: "alice",
      address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
      derivation: "//Alice",
      bond: validator_bond_const,
    },
    {
      name: "bob",
      address: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
      derivation: "//Bob",
      bond: validator_bond_const,
    },
    {
      name: "charlie",
      address: "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y",
      derivation: "//Charlie",
      bond: validator_bond_const,
    },
  ];

  const nominators = [
    {
      name: "Nom 1",
      address: "4hrwcD8w6CQDpHrfPeEFBsnX9N7bMbNhZTQ2TbfJMECz1QgV",
      seed: "hollow fringe smoke orbit bottom sick sauce fiber lazy wine alone mother",
      nominations: [{ valid_id: 0, bond: nominator_bond_const }],
    },
    {
      name: "Nom 2",
      address: "4mfj85NG13nfFcQy5g5VkoaW7sxRKafVbQMUtaDKbrsXibdh",
      seed: "prevent mushroom elevator thumb stable unfair alcohol find leg fly couple deny",
      nominations: [{ valid_id: 1, bond: nominator_bond_const }],
    },
    {
      name: "Nom 3",
      address: "4n5XJ1xCWeeVyaq7BUp1Ev4HYYgnbeM2HYWtGdxovSyE5rKx",
      seed: "panda party toe child advance lawsuit meadow burden access below brown lift",
      nominations: [{ valid_id: 1, bond: nominator_bond_const }],
    },
    {
      name: "Nom 4",
      address: "4kp763YBzp7njrPDNQQs4zp7WS5irjRrebMcG1P66Fwfkudk",
      seed: "physical glance describe mandate consider cricket detail excuse steak artwork broccoli diesel",
      nominations: [{ valid_id: 2, bond: nominator_bond_const }],
    },
  ];

  const aliceKeyPair = keyring.addFromUri("//Alice");
  let aliceNonce = (
    await api.query.system.account(aliceKeyPair.address)
  ).nonce.toNumber();

  // Join Validator pool
  for (const validator of validators) {
    if (validator.name === "alice") {
      continue;
    }
    // Validator join's the pool
    console.log(
      `{TestSetup::${validator.name}} account: ${validator.address} Joins the Validator pool`
    );
    const valid_join_pool = api.tx.staking.validatorJoinPool(
      validator.bond.toString()
    );
    try {
      const validKeyPair = keyring.addFromUri(validator.derivation);
      const validNonce = (
        await api.query.system.account(validKeyPair.address)
      ).nonce.toNumber();

      const hash = await valid_join_pool.signAndSend(validKeyPair, {
        nonce: validNonce,
      });
    } catch {
      console.log("{TestSetup::${validator.name}} transfer tx failed...");
    }
    await sleep(6000);
  }

  // Nominator nominates
  for (const nominator of nominators) {
    const transfer = api.tx.balances.transfer(
      nominator.address,
      (nominator_bond_const * 2).toString()
    );
    try {
      const hash = await transfer.signAndSend(aliceKeyPair, {
        nonce: aliceNonce,
      });
    } catch {
      console.log(`{TestSetup::${nominator.name}} transfer tx failed...`);
    }
    aliceNonce++;
    await sleep(6000);

    console.log(
      `{TestSetup:: Nominator ${nominator.name}} account: ${nominator.address} Joins the Validator pool`
    );

    const nomiKeyPair = keyring.addFromUri(nominator.seed);
    let nomiNonce = (
      await api.query.system.account(nomiKeyPair.address)
    ).nonce.toNumber();

    for (const valid_nomination of nominator.nominations) {
      const nominator_nominates = api.tx.staking.nominatorNominate(
        validators[valid_nomination.valid_id].address,
        valid_nomination.bond.toString()
      );
      try {
        const hash = await nominator_nominates.signAndSend(nomiKeyPair, {
          nonce: nomiNonce,
        });
      } catch {
        console.log(`{TestSetup::${nominator.name}} transfer tx failed...`);
      }
      nomiNonce++;
    }
  }

  await sleep(2000);

  const TOTAL_USERS = 100;
  const TOKENS_TO_SEND = "12345678912345";
  const MAX_ITERATIONS = 1000;

  const eveKeyPair = keyring.addFromUri("//Eve");
  let eveNonce = (
    await api.query.system.account(eveKeyPair.address)
  ).nonce.toNumber();

  const nonces = [];
  console.log("Fetching nonces for accounts...");
  for (let userNo = 0; userNo <= TOTAL_USERS; userNo++) {
    const stringSeed = seedFromNum(userNo);
    const keys = keyring.addFromUri(stringSeed);
    const nonce = (
      await api.query.system.account(keys.address)
    ).nonce.toNumber();
    nonces.push(nonce);
  }
  console.log("All nonces fetched!");

  for (let iter_idx = 0; iter_idx < MAX_ITERATIONS; iter_idx++) {
    if (iter_idx % 2 == 0) {
      console.log("Endowing all users from Eve account...");
      console.log("Eve nonce is " + eveNonce);

      for (let seed = 0; seed <= TOTAL_USERS; seed++) {
        const keypair = keyring.addFromUri(seedFromNum(seed));

        try {
          const mint = api.tx.balances.transfer(
            keypair.address,
            TOKENS_TO_SEND
          );
          const receiverSeed = seedFromNum(seed);
          console.log(`Eve -> ${receiverSeed} (${keypair.address})`);
          await mint.signAndSend(eveKeyPair, { nonce: eveNonce });
        } catch {
          console.log(`TestSetup::Eve transfer tx failed...`);
        }
        eveNonce++;
      }

      console.log(`Iter-${iter_idx} | All users endowed from Eve account!!!`);
      await sleep(24000);
    } else {
      console.log("Seed users -> Eve accounts...");

      for (let userNo = 0; userNo <= TOTAL_USERS; userNo++) {
        const keypair = keyring.addFromUri(seedFromNum(userNo));

        const usrNonce = nonces[userNo];
        nonces[userNo]++;

        try {
          const transfer = api.tx.balances.transfer(
            eveKeyPair.address,
            TOKENS_TO_SEND
          );

          console.log(`${seedFromNum(userNo)} -> Eve (${keypair.address})`);
          await transfer.signAndSend(keypair, { nonce: usrNonce });
        } catch {
          console.log(
            `TestSetup::${seedFromNum(userNo)} transfer tx failed...`
          );
        }
      }

      console.log(
        `Iter-${iter_idx} | All users balance moved to Eve account!!!`
      );
      await sleep(24000);
    }
  }
};

function seedFromNum(seed: number): string {
  return "//user//" + ("0000" + seed).slice(-4);
}

async function getBlockStats(
  api: ApiPromise,
  hash?: BlockHash | undefined
): Promise<any> {
  const signedBlock = hash
    ? await api.rpc.chain.getBlock(hash)
    : await api.rpc.chain.getBlock();

  console.log(`getBlockStats> ${signedBlock.block.extrinsics.length}`);

  // the hash for each extrinsic in the block
  // let timestamp = signedBlock.block.extrinsics.find(
  //     ({ method: { methodName, sectionName } }) => sectionName === 'timestamp' && methodName === 'set'
  // )!.method.args[0].toString();

  let ret_meta = null;
  for (const e of signedBlock.block.extrinsics) {
    const { meta, method, section } = await api.registry.findMetaCall(
      e.method.callIndex
    );
    if (section === "timestamp" && method === "set") {
      ret_meta = e.method.args[0].toString();
    }
  }

  const blockStats = {
    meta: ret_meta,
    transactions: signedBlock.block.extrinsics.length,
    parent: signedBlock.block.header.parentHash,
  };

  console.log(`getBlockStats> ${blockStats.meta}`);

  return blockStats;
}
