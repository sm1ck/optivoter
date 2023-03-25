import Web3 from "web3";
import { BigNumber } from "ethers";
import * as fs from "fs";
import * as path from "path";
import * as accs from "./accs.js";
import { exit } from "process";

/**
 * Случайное min/max целое значение
 * @param {Integer} min
 * @param {Integer} max
 * @returns Случайное число
 */

const randomIntInRange = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Абстрактная задержка (async)
 * @param {Integer} millis
 * @returns
 */

const sleep = async (millis) =>
  new Promise((resolve) => setTimeout(resolve, millis));

// Базовые переменные
const version = "0.0.1";
const isSleep = true; // задержка перед отправкой, нужна ли? изменить на true, если нужна
const sleep_from = 60; // от 60 секунд
const sleep_to = 360; // до 360 секунд
const vote = "1"; // вариант голосования
const optiVoteAddress = "0xcdf27f107725988f2261ce2256bdfcde8b382b10"; // optimism vote contract
const optiTokenAddress = "0x4200000000000000000000000000000000000042"; // optimism token

// rpc
const web3 = new Web3(
  "wss://opt-mainnet.g.alchemy.com/v2/tvXigZ3Mc7YnALebtwAibC51ZgB8XG5w"
);

// dir path
const __dirname = path.resolve();

// abi
const OPTIMISM_VOTE_ABI = JSON.parse(
  fs.readFileSync(path.join(__dirname, "/OPTIMISM_VOTE_ABI.json"), "utf8")
);
const ERC20_ABI = JSON.parse(
  fs.readFileSync(path.join(__dirname, "/ERC20.json"), "utf8")
);
const contract = new web3.eth.Contract(OPTIMISM_VOTE_ABI, optiVoteAddress);
const contract_erc20 = new web3.eth.Contract(ERC20_ABI, optiTokenAddress);

// Авторство
console.log(`-=- optivoter v${version} -=-`);
console.log(
  "License: MIT\nAuthor: @JanSergeev\nDonate: 0x9D278054C3e73294215b63ceF34c385Abe52768B"
);

// Парсинг параметров
let prop_id;
process.argv.forEach(function (val, index, array) {
  switch (index) {
    case 2:
      prop_id = val;
  }
});

// Основной цикл, голосуем он-чейн..
let promises = [];
let wallets = await accs.importETHWallets();
for (let j = 0; j < wallets.length; j++) {
  const wallet = web3.eth.accounts.privateKeyToAccount(wallets[j]);
  // check OP balance to prevent 0 balance vote
  let bal = await contract_erc20.methods.balanceOf(wallet.address).call();
  if (bal == 0) {
    console.log(`(OptiVoter #${j}) => ${wallet.address}: у вас 0 OP!`);
    continue;
  }
  let prom = promises.push(
    new Promise(async (resolve, reject) => {
      try {
        let bal_eth = await web3.eth.getBalance(wallet.address);
        let gas = await contract.methods
          .castVoteWithReason(prop_id, vote, "")
          .estimateGas({
            from: wallet.address,
          });
        let minETHNeed = BigNumber.from(gas).mul(
          BigNumber.from(await web3.eth.getGasPrice())
        );
        if (BigNumber.from(bal_eth).gt(minETHNeed)) {
          let tx = {
            from: wallet.address,
            to: optiVoteAddress,
            gas: gas,
            data: await contract.methods
              .castVoteWithReason(prop_id, vote, "")
              .encodeABI(),
          };
          // Подписываем и отправляем
          let signedTx = await web3.eth.accounts.signTransaction(
            tx,
            wallets[j]
          );
          web3.eth
            .sendSignedTransaction(signedTx.rawTransaction)
            .on("transactionHash", async (hash) => {
              console.log(
                `(OptiVoter #${j}) => ${wallet.address}: транзакция отправлена -> https://optimistic.etherscan.io/tx/${hash}`
              );
              resolve();
            })
            .on("error", (error) => {
              console.log(`(OptiVoter #${j}) => ${wallet.address}: ошибка ->`);
              console.dir(error);
              resolve();
            });
        } else {
          console.log(
            `(OptiVoter #${j}) => ${wallet.address}: недостаточный баланс кошелька`
          );
          resolve();
        }
      } catch (err) {
        console.log(`(OptiVoter #${j}) => ${wallet.address}: ошибка ->`);
        console.dir(err);
        resolve();
      }
    })
  );
  if (isSleep) {
    let sle = randomIntInRange(sleep_from, sleep_to);
    promises
      .at(prom - 1)
      .then(() =>
        j < wallets.length
          ? console.log(
              `(OptiVoter #${j}) => ${wallet.address}: задержка ${sle}с..`
            )
          : null
      );
    j < wallets.length ? await sleep(sle * 1000) : null;
  }
}
await Promise.allSettled(promises).then(() =>
  console.log("Завершение работы..")
);
exit();
