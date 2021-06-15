import ApiHandler from "./../ApiHandler";
import { Keyring } from "@polkadot/keyring";
import { sleep } from "../util";

export const startTestSetup = async () => {
  //   const handler = await ApiHandler.create(["ws://172.28.1.1:9944"]);
  const handler = await ApiHandler.create(["ws://localhost:9944"]);

  const api = await handler.getApi();

  console.log(
    `{TestSetup::startTestSetup} handler ws://localhost:9944 is connected: ${handler.isConnected()}`
  );

  const keyring = new Keyring({ type: "sr25519" });

  const validator_bond_const = 20000000000000;
  const nominator_bond_const = 10000000000000;

  const ping_pong = [
    {
	  name: "ping",
      seed: "card insect figure furnace better miracle lend monitor call inner half top",
      address: "4mJURgirCMN5QL1CgHSnRTScFfrKWSuRQoZNmj8zMJpsYJTn",
    },
    {
	  name: "pong",
      seed: "milk snake bracket tomato little peanut claim cook gate decide crystal luggage",
      address: "4mhZUKaQ56t3AJSiH62B3qKn1emerm2KvsdyuKbWWuRP7tPK",
    },
  ];

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

  // Send funds to ping address:
  console.log(
    `{TestSetup:: Sending funds to ping address: ${ping_pong[0].address}`
  );
  const pingTransfer = api.tx.balances.transfer(
    ping_pong[0].address,
    "61728394561725"
  );
  try {
    const hash = await pingTransfer.signAndSend(keyring.addFromUri("//Alice"));
  } catch {
    console.log(
      `{TestSetup::Reward::${ping_pong[0].address}} transfer tx failed...`
    );
  }
  await sleep(6000);

  // Send funds to pong address:
  console.log(
    `{TestSetup:: Sending funds to pong address: ${ping_pong[1].address}`
  );
  const pongTransfer = api.tx.balances.transfer(
    ping_pong[1].address,
    "61728394561725"
  );
  try {
    const hash = await pongTransfer.signAndSend(keyring.addFromUri("//Alice"));
  } catch {
    console.log(
      `{TestSetup::Reward::${ping_pong[1].address}} transfer tx failed...`
    );
  }
  await sleep(6000);

  for (const validator of validators) {
    if (validator.name === "alice") {
      continue;
    }

    // Validator join's the pool
    console.log(
      `{TestSetup::${validator.name}} account: ${validator.address} Joins the Validator pool`
    );
    const valid_join_pool = api.tx.staking.validatorJoinPool(validator.bond.toString());
    try {
      const hash = await valid_join_pool.signAndSend(
        keyring.addFromUri(validator.derivation)
      );
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
      const hash = await transfer.signAndSend(keyring.addFromUri("//Alice"));
    } catch {
      console.log(`{TestSetup::${nominator.name}} transfer tx failed...`);
    }
    await sleep(6000);

    console.log(
      `{TestSetup:: Nominator ${nominator.name}} account: ${nominator.address} Joins the Validator pool`
    );

    for (const valid_nomination of nominator.nominations) {
      const nominator_nominates = api.tx.staking.nominatorNominate(
        validators[valid_nomination.valid_id].address,
        valid_nomination.bond.toString(),
      );
      try {
        const hash = await nominator_nominates.signAndSend(
          keyring.addFromUri(nominator.seed)
        );
      } catch {
        console.log(`{TestSetup::${nominator.name}} transfer tx failed...`);
      }
      await sleep(6000);
    }
  }

  for (let i = 0; i < 100000; i++) {
	let send_from_id = i % 2;
	let send_to_id = send_from_id ^ 1;

	console.log(
		`{TestSetup:: Ping-Pong Transfer Iteration ${i} ${send_from_id} -> ${send_to_id}`,
	);

	const transfer = api.tx.balances.transfer(
		ping_pong[send_to_id].address,
		"12345678912345"
	  );
	  try {
		const hash = await transfer.signAndSend(
			keyring.addFromUri(ping_pong[send_from_id].seed)
		);
	  } catch {
		console.log(`{TestSetup::ping-pong ${ping_pong[send_from_id].address}} transfer tx failed...`);
	  }
	  await sleep(10000);
  }

};
