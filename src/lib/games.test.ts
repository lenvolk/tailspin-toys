import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getGameById,
    getGamesByCategory,
    getGamesByFilters,
    getGamesByPublisher,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

interface FilterFixtureIds {
    categories: {
        strategy: number;
        puzzle: number;
    };
    publishers: {
        codeForge: number;
        devMasters: number;
    };
}

async function seedFilterFixtures(db: Database): Promise<FilterFixtureIds> {
    const [strategy] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'strategy' })
        .returning({ id: categories.id });
    const [puzzle] = await db
        .insert(categories)
        .values({ name: 'Puzzle', description: 'puzzle' })
        .returning({ id: categories.id });
    const [codeForge] = await db
        .insert(publishers)
        .values({ name: 'CodeForge Studios', description: 'code forge' })
        .returning({ id: publishers.id });
    const [devMasters] = await db
        .insert(publishers)
        .values({ name: 'DevMasters Inc.', description: 'dev masters' })
        .returning({ id: publishers.id });

    await db.insert(games).values([
        {
            title: 'Puzzle Alpha',
            description: 'Puzzle',
            starRating: 4.2,
            categoryId: puzzle.id,
            publisherId: codeForge.id,
        },
        {
            title: 'Strategy Beta',
            description: 'Strategy',
            starRating: 4.3,
            categoryId: strategy.id,
            publisherId: devMasters.id,
        },
        {
            title: 'Strategy Gamma',
            description: 'Strategy',
            starRating: 4.4,
            categoryId: strategy.id,
            publisherId: codeForge.id,
        },
    ]);

    return {
        categories: { strategy: strategy.id, puzzle: puzzle.id },
        publishers: { codeForge: codeForge.id, devMasters: devMasters.id },
    };
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });

    it('filters games by category while preserving title ordering', async () => {
        const fixture = await seedFilterFixtures(db);

        const filtered = await getGamesByCategory(db, fixture.categories.strategy);

        expect(filtered.map((game) => game.title)).toEqual([
            'Strategy Beta',
            'Strategy Gamma',
        ]);
    });

    it('filters games by publisher', async () => {
        const fixture = await seedFilterFixtures(db);

        const filtered = await getGamesByPublisher(db, fixture.publishers.codeForge);

        expect(filtered.map((game) => game.title)).toEqual([
            'Puzzle Alpha',
            'Strategy Gamma',
        ]);
    });

    it('combines publisher filtering with OR category filtering', async () => {
        const fixture = await seedFilterFixtures(db);

        const filtered = await getGamesByFilters(db, {
            categoryIds: [fixture.categories.strategy, fixture.categories.puzzle],
            publisherId: fixture.publishers.codeForge,
        });

        expect(filtered.map((game) => game.title)).toEqual([
            'Puzzle Alpha',
            'Strategy Gamma',
        ]);
    });

    it('treats an empty category filter as all categories', async () => {
        await seedGames(db, 2);

        const filtered = await getGamesByFilters(db, { categoryIds: [] });

        expect(filtered).toHaveLength(2);
        expect(filtered.map((game) => game.title)).toEqual(['Game 01', 'Game 02']);
    });
});
