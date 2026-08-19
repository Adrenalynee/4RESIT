import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getMealTypes } from '../api/mealTypesApi'
import { getCuisines } from '../api/cuisinesApi'
import { getDiets } from '../api/dietsApi'
import { getDifficultyLevels } from '../api/difficultyApi'

const RecipeTaxonomyContext = createContext(null)

export function RecipeTaxonomyProvider({ children }) {
  const [mealTypes, setMealTypes] = useState([])
  const [cuisines, setCuisines] = useState([])
  const [diets, setDiets] = useState([])
  const [difficulties, setDifficulties] = useState([])

  useEffect(() => {
    getMealTypes().then(setMealTypes)
    getCuisines().then(setCuisines)
    getDiets().then(setDiets)
    getDifficultyLevels().then(setDifficulties)
  }, [])

  const getLabel = useMemo(() => {
    const labelsByValue = new Map(
      [...mealTypes, ...cuisines, ...diets, ...difficulties].map((o) => [o.value, o.label]),
    )
    return (value) => labelsByValue.get(value) || value
  }, [mealTypes, cuisines, diets, difficulties])

  return (
    <RecipeTaxonomyContext.Provider value={{ mealTypes, cuisines, diets, difficulties, getLabel }}>
      {children}
    </RecipeTaxonomyContext.Provider>
  )
}

export function useRecipeTaxonomy() {
  const ctx = useContext(RecipeTaxonomyContext)
  if (!ctx) throw new Error('useRecipeTaxonomy doit être utilisé dans un RecipeTaxonomyProvider')
  return ctx
}
