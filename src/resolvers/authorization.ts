import { ForbiddenError } from 'apollo-server-express';
import { skip } from 'graphql-resolvers';
import { Me } from '../types';

export const isAuthenticated = (_, __, { me }: { me: Me }) =>
  me ? skip : new ForbiddenError('Not authenticated.');