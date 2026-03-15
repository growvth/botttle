import { userRepository } from './repository.js';
import type { UpdateUserBody } from './schema.js';

export const userService = {
  async getById(id: string) {
    return userRepository.findById(id);
  },

  async list() {
    return userRepository.findAll();
  },

  async update(id: string, body: UpdateUserBody) {
    const existing = await userRepository.findById(id);
    if (!existing) return null;
    const data: Parameters<typeof userRepository.update>[1] = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.disabled !== undefined) data.disabled = body.disabled;
    if (body.role !== undefined) data.role = body.role;
    if (body.clientId !== undefined) data.clientId = body.clientId;
    return userRepository.update(id, data);
  },
};
