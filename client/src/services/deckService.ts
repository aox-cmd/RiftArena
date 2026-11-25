import { api } from "./api";
import type { Deck } from "../types";

interface DeckInput {
  name: string;
  characterIds: string[];
}

export const deckService = {
  async list() {
    const { data } = await api.get<Deck[]>("/decks");
    return data;
  },

  async create(input: DeckInput) {
    const { data } = await api.post<Deck>("/decks", input);
    return data;
  },

  async update(id: string, input: DeckInput) {
    const { data } = await api.put<Deck>(
      `/decks/${id}`,
      input
    );

    return data;
  },

  async activate(id: string) {
    const { data } = await api.patch<Deck>(
      `/decks/${id}/activate`
    );

    return data;
  },

  async remove(id: string) {
    await api.delete(`/decks/${id}`);
  }
};
