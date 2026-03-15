import { clientRepository } from './repository.js';
import type { CreateClientBody, UpdateClientBody } from './schema.js';

export const clientService = {
  async getById(id: string) {
    return clientRepository.findById(id);
  },

  async list() {
    return clientRepository.findAll();
  },

  async create(body: CreateClientBody) {
    return clientRepository.create({ name: body.name, email: body.email ?? null });
  },

  async update(id: string, body: UpdateClientBody) {
    const existing = await clientRepository.findById(id);
    if (!existing) return null;
    return clientRepository.update(id, {
      name: body.name,
      email: body.email,
    });
  },

  async delete(id: string) {
    const existing = await clientRepository.findById(id);
    if (!existing) return null;
    await clientRepository.delete(id);
    return { deleted: true };
  },
};
