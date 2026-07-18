import { and, asc, eq, inArray } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Game } from '../types/game';

const gameSelection = {
    id: games.id,
    title: games.title,
    description: games.description,
    starRating: games.starRating,
    categoryId: categories.id,
    categoryName: categories.name,
    publisherId: publishers.id,
    publisherName: publishers.name,
};

type GameSelectionRow = {
    id: number;
    title: string;
    description: string;
    starRating: number | null;
    categoryId: number | null;
    categoryName: string | null;
    publisherId: number | null;
    publisherName: string | null;
};

function mapGame(row: GameSelectionRow): Game {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        starRating: row.starRating,
        category:
            row.categoryId !== null && row.categoryName !== null
                ? { id: row.categoryId, name: row.categoryName }
                : null,
        publisher:
            row.publisherId !== null && row.publisherName !== null
                ? { id: row.publisherId, name: row.publisherName }
                : null,
    };
}

function baseGamesQuery(db: Database) {
    return db
        .select(gameSelection)
        .from(games)
        .leftJoin(categories, eq(games.categoryId, categories.id))
        .leftJoin(publishers, eq(games.publisherId, publishers.id));
}

/** Optional constraints supported by the game listing queries. */
export interface GameFilters {
    categoryIds?: number[];
    publisherId?: number;
}

/**
 * Returns games matching optional category and publisher filters.
 *
 * @param db Database connection used for the query.
 * @param filters Optional category and publisher constraints.
 * @returns Matching games ordered by title.
 */
export async function getGamesByFilters(
    db: Database,
    filters: GameFilters = {},
): Promise<Game[]> {
    const conditions: SQL[] = [];

    if (filters.categoryIds && filters.categoryIds.length > 0) {
        conditions.push(inArray(games.categoryId, filters.categoryIds));
    }

    if (filters.publisherId !== undefined) {
        conditions.push(eq(games.publisherId, filters.publisherId));
    }

    const query = baseGamesQuery(db);
    const rows =
        conditions.length > 0
            ? await query.where(and(...conditions)).orderBy(asc(games.title))
            : await query.orderBy(asc(games.title));

    return rows.map(mapGame);
}

/**
 * Returns every game ordered by title.
 *
 * @param db Database connection used for the query.
 * @returns All mapped games ordered by title.
 */
export async function getAllGames(db: Database): Promise<Game[]> {
    return getGamesByFilters(db);
}

/**
 * Returns games in a category ordered by title.
 *
 * @param db Database connection used for the query.
 * @param categoryId Category identifier to match.
 * @returns Matching games ordered by title.
 */
export async function getGamesByCategory(
    db: Database,
    categoryId: number,
): Promise<Game[]> {
    return getGamesByFilters(db, { categoryIds: [categoryId] });
}

/**
 * Returns games from a publisher ordered by title.
 *
 * @param db Database connection used for the query.
 * @param publisherId Publisher identifier to match.
 * @returns Matching games ordered by title.
 */
export async function getGamesByPublisher(
    db: Database,
    publisherId: number,
): Promise<Game[]> {
    return getGamesByFilters(db, { publisherId });
}

/**
 * Returns all game identifiers ordered by their game titles.
 *
 * @param db Database connection used for the query.
 * @returns Game identifiers ordered by title.
 */
export async function getAllGameIds(db: Database): Promise<number[]> {
    const rows = await db.select({ id: games.id }).from(games).orderBy(asc(games.title));
    return rows.map((row) => row.id);
}

/**
 * Finds a single game by identifier.
 *
 * @param db Database connection used for the query.
 * @param id Game identifier to find.
 * @returns The mapped game, or null when no game matches.
 */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
    const rows = await baseGamesQuery(db).where(eq(games.id, id)).limit(1);
    return rows.length > 0 ? mapGame(rows[0]) : null;
}
