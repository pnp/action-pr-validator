"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidatorFactory = void 0;
const ValidatorRegistry_1 = require("./ValidatorRegistry");
class ValidatorFactory {
    static createValidator(ruleName, ruleConfig, context) {
        const ValidatorClass = ValidatorRegistry_1.ValidatorRegistry[ruleName];
        if (!ValidatorClass) {
            return null; // Unknown rule
        }
        // Dynamically instantiate the validator with the required dependencies
        return new ValidatorClass(ruleConfig, context);
    }
}
exports.ValidatorFactory = ValidatorFactory;
