const { setupSuiteContext } = require("../helpers/suiteContext");
const { describePosBaseTests } = require("../shared/posBase.shared");

describe("POS Integrado - POSBase", () => {
    const suite = setupSuiteContext();

    describePosBaseTests({
        createPos: () => suite.createIntegrado()
    });
});
