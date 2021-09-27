"use strict";
exports.__esModule = true;
exports.findOperatorToSql = exports.whereToRaw = void 0;
var typeorm_1 = require("typeorm");
/**
 * Convert FindConditions to raw SQL query.
 * @param whereOptions
 * @param entityTableName parent entity name. Class name.
 * @param raw need for recursion. No need to specify
 * @param deep need for recursion. No need to specify
 * @returns
 */
function whereToRaw(entity, whereOptions, howFormatKeys, raw, deep) {
    if (raw === void 0) { raw = ''; }
    if (deep === void 0) { deep = 0; }
    deep++;
    for (var _i = 0, _a = Object.entries(whereOptions); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        var keyInDB = howFormatKeys !== 'none' ? formatKey(key, howFormatKeys) : key;
        // TODO work with array (OR)
        if (typeof value !== 'object') {
            var keyWithPrefix = "\"" + entity + "\".\"" + keyInDB + "\"";
            raw += (raw ? ' AND ' : '') + (keyWithPrefix + " = " + (typeof value === 'string' ? "'" + value + "'" : value));
        }
        else if (value instanceof typeorm_1.FindOperator) {
            var keyWithPrefix = "\"" + entity + "\".\"" + keyInDB + "\"";
            raw += (raw ? ' AND ' : '') + findOperatorToSql(value, keyWithPrefix, value.value);
        }
        else if (typeof value === 'object') { // работа с вложенными сущностями
            var keyWithPrefix = entity + "__" + key;
            raw = whereToRaw(keyWithPrefix, value, howFormatKeys, raw, deep);
        }
    }
    return raw;
}
exports.whereToRaw = whereToRaw;
/**
 * Get SQL from FindOperator
 * @param value FindOperator
 * @param connection connection
 * @param aliasPath
 * @param parameters parameters (condition value). One value or array of values.
 * @returns
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
function findOperatorToSql(value, aliasPath, parameters) {
    var _a;
    var param;
    // wrap in quotes if string
    if (!value.multipleParameters) {
        if (typeof parameters === 'string') {
            param = "'" + parameters + "'";
        }
        else {
            param = parameters;
        }
    }
    else if (parameters.length === 1) {
        if (typeof parameters[0] === 'string') {
            param = "'" + parameters[0] + "'";
        }
        else {
            param = parameters[0];
        }
    }
    else if (parameters.length > 1) {
        param = [];
        if (typeof parameters[0] === 'string') {
            for (var _i = 0, parameters_1 = parameters; _i < parameters_1.length; _i++) {
                var p = parameters_1[_i];
                param.push("'" + p + "'");
            }
        }
        else {
            param = parameters;
        }
    }
    switch (value._type) {
        case 'not':
            if (value.value instanceof typeorm_1.FindOperator) {
                return 'NOT(' + findOperatorToSql(value, aliasPath, parameters) + ')';
            }
            else {
                // for 'isNull()' value.value equals undefined, but _value exists
                if (((_a = value._value) === null || _a === void 0 ? void 0 : _a._type) === 'isNull') {
                    return aliasPath + " IS NOT NULL";
                }
                else {
                    return aliasPath + ' <> ' + param;
                }
            }
        case 'lessThan':
            return aliasPath + ' < ' + param;
        case 'lessThanOrEqual':
            return aliasPath + ' <= ' + param;
        case 'moreThan':
            return aliasPath + ' > ' + param;
        case 'moreThanOrEqual':
            return aliasPath + ' >= ' + param;
        case 'equal':
            return aliasPath + ' = ' + param;
        case 'like':
            return aliasPath + ' LIKE ' + param;
        case 'between':
            return aliasPath + ' BETWEEN ' + param[0] + ' AND ' + param[1];
        case 'in':
            return aliasPath + ' IN (' + (Array.isArray(param) && param.length > 1 ? param.join(', ') : param) + ')';
        case 'any':
            return aliasPath + ' = ANY(' + param + ')';
        case 'isNull':
            return aliasPath + ' IS NULL';
        case 'raw':
            if (value instanceof Function) {
                return value(aliasPath);
            }
            else {
                return aliasPath + ' = ' + value;
            }
        default: return '';
    }
}
exports.findOperatorToSql = findOperatorToSql;
/**
 * Format field of class to real name in DB
 * @param str
 */
function formatKey(key, howFormatKeys) {
    switch (howFormatKeys) {
        case 'camel_to_snakecase':
            return camelToSnakeCase(key);
        case 'snake_to_camelcase':
            return snakeToCamelCase(key);
        default:
            return howFormatKeys(key);
    }
}
function camelToSnakeCase(str) {
    return str.replace(/[A-Z]/g, function (letter) { return "_" + letter.toLowerCase(); });
}
function snakeToCamelCase(str) {
    return str
        .split("_")
        .reduce(function (res, word, i) {
        return i === 0
            ? word.toLowerCase()
            : "" + res + word.charAt(0).toUpperCase() + word.substr(1).toLowerCase();
    }, "");
}
