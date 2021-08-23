import { whereToRaw } from "../index";
import { 
    createConnection, getConnection,
    Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, getRepository,
    FindConditions, MoreThan, In, Not, 
} from "typeorm";

@Entity()
export class Category {

    @PrimaryGeneratedColumn()
    public id: number;

    @Column()
    public name: string;

    @OneToMany(() => Post, post => post.category)
    public posts: Post[];
}

@Entity()
export class Post {

    @PrimaryGeneratedColumn()
    public id: number|undefined|null|string;

    @Column()
    public title: string;

    @Column()
    @JoinColumn({ name: 'categoryId' })
    public categoryId: number;

    @ManyToOne(() => Category, category => category.posts)
    @JoinColumn({ name: 'categoryId' })
    public category: Category;
}

beforeEach(async () => {
    await createConnection({
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: 'postgres',
        database: '__tests_typeorm_nested_where',
        dropSchema: true,
        logging: false,
        synchronize: true,
        migrationsRun: true,
        entities: [Category, Post]
    });
    const catA = await getRepository(Category).save({ name: 'Category A' });
    const catB = await getRepository(Category).save({ name: 'Category B' });
    await getRepository(Category).save({ name: 'Category C' });
    await getRepository(Post).insert({ title: 'Post 1', categoryId: catA.id });
    await getRepository(Post).insert({ title: 'Post 2', categoryId: catB.id });
    await getRepository(Post).insert({ title: 'Post 3', categoryId: catB.id });

    return;
});

afterEach(() => {
    let conn = getConnection();
    return conn.close();
});

test("pretest: test that database filled", async () => {
    const categoryCount = await getRepository(Category).count();
    expect(categoryCount).toBe(3);
    const postCount = await getRepository(Post).count();
    expect(postCount).toBe(3);
});

test("without nested conditions, one to many", async () => { 
    const where1: FindConditions<Category> = {
        name: 'Category B'
    };
    const res1 = await getRepository(Category).find({
        where: whereToRaw<Category>('Category', where1, 'none'),
        relations: ['posts']
    });
    expect(res1.length).toBe(1);
    expect(res1[0].posts?.length).toBe(2);
});

test("without nested conditions, many to one", async () => {
    const where2: FindConditions<Post> = {
        title: 'Post 1'
    };
    const res2 = await getRepository(Post).find({
        where: whereToRaw<Post>('Post', where2, 'none'),
        relations: ['category']
    });
    expect(res2.length).toBe(1);
    expect(res2[0].category).toBeDefined();
    expect(res2[0].category?.name).toBe('Category A');
});

test("with nested conditions, one to many", async () => {
    const where3: FindConditions<Category> = {
        name: 'Category B',
        posts: { 
            title: 'Post 2'
        } as FindConditions<Post> as any
    };
    const res3 = await getRepository(Category).find({
        where: whereToRaw<Category>('Category', where3, 'none'),
        relations: ['posts']
    });
    expect(res3.length).toBe(1);
    expect(res3[0].posts?.length).toBe(1);
    expect(res3[0].posts[0].title).toBe('Post 2');
});

test("with nested conditions, many to one", async () => {
    const where4: FindConditions<Post> = {
        category: {
            name: 'Category B'
        } as FindConditions<Category>
    };
    const res4 = await getRepository(Post).find({
        where: whereToRaw<Post>('Post', where4, 'none'),
        relations: ['category']
    });
    expect(res4.length).toBe(2);
    expect(res4[0].category?.name).toBe('Category B');
    expect(res4[1].category?.name).toBe('Category B');
});


test("many conditions", async () => {
    const where: FindConditions<Category> = {
        name: In(['Category A', 'Category B']),
        posts: { 
            title: Not(In(['Post 2'])),
            id: MoreThan(0),
        } as FindConditions<Post> as any
    };
    const categories = await getRepository(Category).find({
        where: whereToRaw<Category>('Category', where, 'none'),
        relations: ['posts']
    });
    expect(categories.length).toBe(2);
    for (const category of categories) {
        expect(['Category A', 'Category B']).toContain(category.name);
        if (category.name === 'Category A') {
            expect(category.posts?.length).toBe(1);
            expect(category.posts[0].title).toBe('Post 1');
        } else
        if (category.name === 'Category B') {
            expect(category.posts?.length).toBe(1);
            expect(category.posts[0].title).toBe('Post 3');
        }
    }
});