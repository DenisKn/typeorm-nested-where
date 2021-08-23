import { FindConditions, FindOperator } from 'typeorm';

/**
 * Convert FindConditions to raw SQL query.
 * @param whereOptions
 * @param entityTableName parent entity name. Class name.
 * @param raw need for recursion. No need to specify
 * @param deep need for recursion. No need to specify
 * @returns
 */
export function whereToRaw<Entity>(
    entity: string,
    whereOptions: FindConditions<Entity>,
    howFormatKeys: 'camel_to_snakecase' | 'snake_to_camelcase' | Function | 'none',
    raw = '',
    deep = 0
): string {
    deep++;
    for (const [key, value] of Object.entries(whereOptions)) {
        const keyInDB = howFormatKeys !== 'none' ? formatKey(key, howFormatKeys) : key;
        // TODO work with array (OR)
        if (typeof value !== 'object') {
            const keyWithPrefix = `"${entity}"."${keyInDB}"`;
            raw += (raw ? ' AND ': '') + `${keyWithPrefix} = ${typeof value === 'string' ? `'${value}'` : value }`;
        } else
        if (value instanceof FindOperator) {
            const keyWithPrefix = `"${entity}"."${keyInDB}"`;
            raw += (raw ? ' AND ': '') + findOperatorToSql(value, keyWithPrefix, value.value);
        } else
        if (typeof value === 'object') { // работа с вложенными сущностями
            const keyWithPrefix = `${entity}__${key}`;
            raw = whereToRaw(keyWithPrefix, value, howFormatKeys, raw, deep);
        }
    }

    return raw;
}

/**
 * Get SQL from FindOperator
 * @param value FindOperator
 * @param connection connection
 * @param aliasPath
 * @param parameters parameters (condition value). One value or array of values.
 * @returns
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function findOperatorToSql(value: FindOperator<any> | any, aliasPath: string, parameters: any): string {
    let param;
    // wrap in quotes if string
    if (!value.multipleParameters) {
        if (typeof parameters === 'string') {
            param = `'${parameters}'`;
        } else {
            param = parameters;
        }
    } else if (parameters.length === 1) {
        if (typeof parameters[0] === 'string') {
            param = `'${parameters[0]}'`;
        } else {
            param = parameters[0];
        }
    } else if (parameters.length > 1) {
        param = [];
        if (typeof parameters[0] === 'string') {
            for (const p of parameters) {
                param.push(`'${p}'`);
            }
        } else {
            param = parameters;
        }
    }

    switch (value._type) {
    case 'not':
        if (value.value instanceof FindOperator) {
            return 'NOT(' + findOperatorToSql(value, aliasPath, parameters) + ')';
        } else {
            return aliasPath + ' != ' + param;
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
        } else {
            return aliasPath + ' = ' + value;
        }
    default: return '';
    }
}

/**
 * Format field of class to real name in DB
 * @param str
 */
function formatKey(key: string, howFormatKeys: 'camel_to_snakecase' | 'snake_to_camelcase' | Function): string {
    switch(howFormatKeys) {
        case 'camel_to_snakecase':
            return camelToSnakeCase(key);
        case 'snake_to_camelcase':
            return snakeToCamelCase(key);
        default:
            return (howFormatKeys as Function)(key);
    }
}

function camelToSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function snakeToCamelCase(str: string): string {
  return str
    .split("_")
    .reduce(
      (res, word, i) =>
        i === 0
          ? word.toLowerCase()
          : `${res}${word.charAt(0).toUpperCase()}${word.substr(1).toLowerCase()}`,
      ""
    );
}