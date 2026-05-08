const { setupSuiteContext } = require("../helpers/suiteContext");
const { describePosBaseTests } = require("../shared/posBase.shared");

describe("POS Autoservicio - POSBase", () => {
    const suite = setupSuiteContext();

    describePosBaseTests({
        productName: "POS Autoservicio",
        createPos: () => suite.createAutoservicio()
    });
});
