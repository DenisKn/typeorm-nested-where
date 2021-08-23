###
Nested relations filtering for Typeorm repositories.
Warning: works with typeorm v.2.2.5. For other versions is not checked.

Function _whereToRaw_ can convert your find conditions to raw SQL string.
After that you can use this string in repository query.

Example:
```typescript
const whereConditions: FindConditions<Pet> = {
    name: 'Mike',
    owner: {
        age: 20,
        status: In(['a', 'b']),
    } as FindConditions<User>,
};

// convert conditions to raw SQL string
const rawWhere = whereToRaw('Pet', whereConditions, 'snake_to_camelcase'));

const count = await getConnection().getRepository(Pet).find({
    where: rawWhere,
    relations: ['owner']
});
```

###