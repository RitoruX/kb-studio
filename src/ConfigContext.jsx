import { createContext, useContext } from 'react';
import { DEFAULT_CONFIG } from './constants';

export const ConfigContext = createContext(DEFAULT_CONFIG);
export const useConfig = () => useContext(ConfigContext);
