const yo = require('yo-yo')
const Nervos = require('@nervos/chain').default
const defaultSets = {
  chain: 'http://121.196.200.225:1337',
  chainId: 1,
  privateKey: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  quotaLimit: 53000,
  value: 0
}
const nervos = Nervos(defaultSets.chain)

const css = require('./styles/run-tab-styles')

const ids = {
  chainAddress: 'chainAddress',
  chainId: 'chainId',
  privateKey: 'privateKey',
  quotaLimit: 'quotaLimit',
  appchainValue: 'appchainValue',
  validUntilBlock: 'validUntilBlock',
}

const contractsPanelId = 'appchain-contracts'
const contractInterfaceId = 'contract-interface'

/**
 * @function useCtrConstructorWith
 */
const useCtrConstructorWith = (cb) => {
  const constructor = window.remix.appchain.contracts.selected.props.abi.filter(abi => abi.type === 'constructor')[0]
  if (constructor) {
    return cb(constructor)
  } else {
    throw new Error("No Constructor Found")
  }
}

// append constructor params fieds on panel
const appendParamInputs = (constructor) => {
  const inputs = constructor.inputs.map(input => {
    return `
        <div style="display:flex; margin: 8px 0;">
          <label for="appchain-constructor-${input.name}" style="flex-basis: 100px; text-align: right; padding-right: 15px;">${input.name}:</label>
          <input
            class="${css.col2}"
            style="flex: 1;"
            id="appchain-constructor-${input.name}"
            placeholder="${input.type}"
          />
        </div>
      `
  })
  document.getElementById(contractInterfaceId).innerHTML = inputs.join('')
}

// return constructor fields value
const readConstructorInputs = (constructor) => constructor.inputs.map(input => {
  return document.getElementById(`appchain-constructor-${input.name}`).value
})



/**
 * @function sendToAppChain
 * @desc send Tx to AppChain
 */
window.sendToAppChain = () => {
  if (!window.remix.appchain.contracts.selected) {
    throw new Error("Load and select contract first")
  }
  const els = {}
  // get transaction fields
  Object.keys(ids).map(id => {
    els[id] = document.getElementById(id).value
  })
  // get constructor params
  const _arguments = useCtrConstructorWith(readConstructorInputs)

  console.log('Els')
  console.table(els)
  console.log('arguments')
  console.table(_arguments)

  if (!els.chainAddress) {
    throw new Error("Chain Address Required")
  }
  nervos.setProvider(els.chainAddress)
  window.nervos = nervos
  if (!els.privateKey) {
    throw new Error("Private Key Required")
  }

  const account = nervos.appchain.accounts.privateKeyToAccount(els.privateKey)

  const tx = {
    from: account.address.toLowerCase(),
    privateKey: els.privateKey,
    nonce: Math.random().toString(),
    quota: +els.quotaLimit,
    chainId: +els.chainId,
    version: 0,
    validUntilBlock: +els.validUntilBlock,
    value: els.appchainValue,
  }
  const myContract = new nervos.appchain.Contract(window.remix.appchain.contracts.selected.props.abi)
  const {
    selected
  } = window.remix.appchain.contracts

  if (document.getElementById("auto-valid-until-block").checked) {
    nervos.appchain.getBlockNumber().then(blockNumber => {
      tx.validUntilBlock = +blockNumber + 88
      myContract.deploy({
        data: selected.props.evm.bytecode.object,
        arguments: _arguments,
      }).send(tx).then(console.log)
      document.getElementById(ids.validUntilBlock).value = tx.validUntilBlock
    })
  } else {
    myContract.deploy({
      data: selected.props.evm.bytecode.object,
      arguments: _arguments,
    }).send(tx).then(console.log)
  }
  console.log('transactions')
  console.table(tx)
  console.log(nervos.currentProvider)
}


/**
 * @function loadConstructParams
 */
const loadConstructParams = () => {
  const ctrName = window.remix.appchain.contracts.selected
  if (!ctrName) return
  useCtrConstructorWith(appendParamInputs)
}

/**
 * @function setSelectedContract
 */
const setSelectedContract = (name) => {
  window.remix.appchain.contracts.selected = {
    name,
    props: window.remix.appchain.contracts.loaded[name]
  }
  // console.log(window.remix.appchain.contracts.selected.props.abi)
  loadConstructParams()
}

const optionGen = (ctrName, ctr) =>
  `<option id=${ctrName} title=${ctrName} value=${ctrName}>${ctrName}</option>`

/**
 * @function appendContractsToAppChainPanel
 * @desc append loaded contracts to appchain panel
 */
const appendContractsToAppChainPanel = contracts => {
  const contractPanel = document.getElementById(contractsPanelId)
  if (!contracts) {
    contractPanel.innerHTML = 'No Contracts Loaded Yet'
  }
  if (contracts) {
    const ctrs = {}
    for (let file in contracts) {
      for (let c in contracts[file]) {
        Object.defineProperty(ctrs, c, {
          value: contracts[file][c],
          enumerable: true,
        })
      }
    }
    window.remix.appchain.contracts.loaded = ctrs
    const options = `
    <label for="selectCtrOptions" style="min-width: 150px; padding-right: 15px; text-align: right;">Contracts:</label>
    <select id="selectCtrOptions" class="${css.select}">
      ${Object.keys(ctrs)
        .map(ctrName => optionGen(ctrName, ctrs[ctrName]))
        .join()}
    </select>
    `
    contractPanel.innerHTML = options

    // set selected contract and add event listener
    const selectEl = window.document.getElementById("selectCtrOptions")
    setSelectedContract(selectEl.value)
    selectEl.addEventListener('change', function () {
      setSelectedContract(this.value)
    })
  }
}

/**
 * @function loadContracts
 * @desc load compiled contracts
 */
window.loadContracts = () => {
  const contracts = window.udapp._deps.compiler.getContracts()
  appendContractsToAppChainPanel(contracts)
}

const chainAddressEl = yo `
    <div class="${css.crow}">
      <div class="${css.col1_1}">Chain Address</div>
      <input type="text"
        class="${css.col2}"
        id=${ids.chainAddress}
        value=${defaultSets.chain}
      />
    </div>
  `
const chainIdEl = yo `
    <div class="${css.crow}">
      <div class="${css.col1_1}">Chain ID</div>
      <input type="text"
      class="${css.col2}"
      id=${ids.chainId}
      value=${defaultSets.chainId} >
    </div>
  `
const privateKeyEl = yo `
    <div class="${css.crow}">
      <div class="${css.col1_1}">Private Key</div>
      <input type="text"
      class="${css.col2}"
      id=${ids.privateKey}
      value=${defaultSets.privateKey} >
    </div>
  `
const quotaLimitEl = yo `
    <div class="${css.crow}">
      <div class="${css.col1_1}">Quota Limit</div>
      <input type="text"
        class="${css.col2}"
        id=${ids.quotaLimit}
        value=${defaultSets.quotaLimit}
        title="Enter the quota"
        placeholder="Enter the quota"
      >
    </div>
  `
const appchainValueEl = yo `
    <div class="${css.crow}">
      <div class="${css.col1_1}">Value</div>
      <input
        type="text"
        class="${css.col2}"
        id=${ids.appchainValue}
        value=${defaultSets.value}
        title="Enter the value"
        placeholder="Enter the value"
      k>
    </div>
  `
const validUntilBlockEl = yo `
    <div class="${css.crow}">
      <div class="${css.col1_1}">Valid Until Block</div>
      <input
        type="text"
        class="${css.col2}"
        id=${ids.validUntilBlock}
        value=""
        title="Enter the validUntilBlock"
        placeholder="Enter the validUntilBlock"
      >
      <div>
        <input type="checkbox" id="auto-valid-until-block" /> Auto
      </div>
    </div>
  `

const submitBtn = yo `
    <a
      href="javascript:window.sendToAppChain()"
      style="background: hsla(0, 82%, 82%, .5); border: 1px solid hsla(0, 82%, 82%, .5)"
    >
      Deploy To AppChain
    </a>
  `

const loadContractBtn = yo `
  <a
    href="javascript:window.loadContracts()"
    style="background: hsla(0, 82%, 82%, .5); border: 1px solid hsla(0, 82%, 82%, .5)"
  >Load Contracts</a>
`
const appchainEl = yo `
  <div class="${css.settings}">
    ${chainAddressEl}
    ${chainIdEl}
    ${privateKeyEl}
    ${quotaLimitEl}
    ${appchainValueEl}
    ${validUntilBlockEl}
    <div>
    ${loadContractBtn}
    </div>
    <div id=${contractsPanelId}></div>
    <div id=${contractInterfaceId}></div>
    ${submitBtn}
  </div>
`
export const appendAppChainSettings = function (container) {
  container.appendChild(appchainEl)
}
