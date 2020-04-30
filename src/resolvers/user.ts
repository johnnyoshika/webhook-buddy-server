import * as yup from 'yup';
import { UserInputError } from 'apollo-server';
import { combineResolvers } from 'graphql-resolvers';
import { isAuthenticated } from './authorization';
import { hashPassword, verifyPassword } from '../services/password';
import { createToken } from '../services/authentication';
import { findByEmail, insert, updateActivity } from '../models/user';

type RegisterInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

type LoginInput = {
  email: string;
  password: string;
};

export default {
  Query: {
    me: combineResolvers(
      isAuthenticated,
      async (_, __, { me }) => me,
    ),
  },

  // validating with graphql-up-middleware: https://github.com/JCMais/graphql-yup-middleware
  // for examples:
  // - see Step 2: Adding the validation schema: https://itnext.io/graphql-mutation-arguments-validation-with-yup-using-graphql-middleware-645822fb748
  // - https://github.com/jquense/yup#usage
  Mutation: {
    register: {
      validationSchema: yup.object().shape({
        input: yup.object().shape({
          firstName: yup
            .string()
            .trim()
            .required('First name is required'),
          lastName: yup
            .string()
            .trim()
            .required('Last name is required'),
          email: yup
            .string()
            .email('Email is invalid')
            .required('Email is required'),
          password: yup
            .string()
            .required('Password is required')
            .min(6, 'Password must be at least 6 characters'),
        }),
      }),
      resolve: async (
        _,
        { input }: { input: RegisterInput },
        { ipAddress }: { ipAddress: string },
      ) => {
        if ((await findByEmail(input.email)) != null)
          throw new Error('Email is already registered.');

        const hash = hashPassword(input.password);

        const user = await insert(
          input.firstName,
          input.lastName,
          input.email,
          hash.hash,
          hash.salt,
          ipAddress,
        );

        return {
          token: createToken(
            { id: user.id },
            process.env.JWT_SECRET,
            '60d',
          ),
        };
      },
    },

    login: {
      validationSchema: yup.object().shape({
        input: yup.object().shape({
          email: yup.string().trim().required('Email is required'),
          password: yup
            .string()
            .trim()
            .required('Password is required'),
        }),
      }),
      resolve: async (
        _,
        { input }: { input: LoginInput },
        { ipAddress }: { ipAddress: string },
      ) => {
        const user = await findByEmail(input.email);
        if (!user) throw new UserInputError('Invalid login.');

        if (
          !verifyPassword(
            input.password,
            user.passwordHash,
            user.passwordSalt,
          )
        )
          throw new UserInputError('Invalid login.');

        await updateActivity(user.id, ipAddress, true, true);

        return {
          token: createToken(
            { id: user.id },
            process.env.JWT_SECRET,
            '60d',
          ),
        };
      },
    },
  },
};
