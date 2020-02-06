"use strict";
exports.__esModule = true;
var ts = require("typescript");
/*
  Limitations:
    - Hooks must starts with 'use'
    - Can't handle hooks that returns more than one value or an array with one element
*/
if (process.argv.length !== 4) {
    console.error('Invalid arguments');
    process.exit(1);
}
var filePath = process.argv[2];
var name = process.argv[3];
var program = ts.createProgram([filePath], { allowJs: true });
var sourceFile = program.getSourceFile(filePath);
sourceFile.statements.forEach(function (statement) {
    var typeStatement = statement;
    if (typeStatement.kind === ts.SyntaxKind.VariableStatement) {
        typeStatement.declarationList.declarations.forEach(function (declaration) {
            var typedName = declaration.name;
            if (typedName.escapedText === name) {
                var typedInitializer = declaration.initializer;
                var stateVars_1 = {};
                var effects_1 = [];
                var manageEffect_1 = function (callExpression) {
                    var typedIdentifier = callExpression.expression;
                    var expressionName = typedIdentifier.escapedText;
                    if (['useEffect', 'useLayoutEffect', 'useMemo', 'useCallback'].includes(expressionName)) {
                        var deps = null;
                        if (callExpression.arguments.length > 1) {
                            deps = callExpression.arguments[1].elements.map(function (a) { return a.escapedText; }).filter(function (e) { return !!e; });
                        }
                        var effectVar = {
                            line: sourceFile.getLineAndCharacterOfPosition(typedIdentifier.pos).line + 1,
                            deps: deps,
                            type: expressionName
                        };
                        effects_1.push(effectVar);
                    }
                };
                typedInitializer.body.statements.forEach(function (statement) {
                    if (ts.isVariableStatement(statement)) {
                        var declarations = statement.declarationList.declarations;
                        if (declarations.length) {
                            var variableDeclaration = declarations[0];
                            if (ts.isCallExpression(variableDeclaration.initializer)) {
                                var typedIdentifier = variableDeclaration.initializer.expression;
                                var isHook = typedIdentifier.text.startsWith('use');
                                if (isHook) {
                                    var stateValueIdentifier = null;
                                    var stateValue = null;
                                    var stateSetter = null;
                                    if (ts.isArrayBindingPattern(variableDeclaration.name)) {
                                        var elements = variableDeclaration.name.elements;
                                        stateValueIdentifier = elements[0].name;
                                        stateValue = stateValueIdentifier.text;
                                        if (elements.length > 1) {
                                            var stateSetterIdentifier = elements[1].name;
                                            stateSetter = stateSetterIdentifier.text;
                                        }
                                    }
                                    else if (ts.isIdentifier(variableDeclaration.name)) {
                                        stateValueIdentifier = variableDeclaration.name;
                                        stateValue = stateValueIdentifier.text;
                                    }
                                    var stateVar = {
                                        line: sourceFile.getLineAndCharacterOfPosition(stateValueIdentifier.pos).line + 1,
                                        value: stateValue,
                                        setter: stateSetter
                                    };
                                    stateVars_1[stateValue] = stateVar;
                                    var isBaseHook = ['useMemo', 'useCallback'].includes(typedIdentifier.text);
                                    if (isBaseHook) {
                                        manageEffect_1(variableDeclaration.initializer);
                                    }
                                }
                            }
                        }
                    }
                    if (ts.isExpressionStatement(statement)) {
                        manageEffect_1(statement.expression);
                    }
                });
                console.log(stateVars_1);
                console.log(effects_1);
            }
        });
    }
});
