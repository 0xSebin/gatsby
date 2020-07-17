import { getMatchPath } from "../get-match-path"

describe(`getMatchPath`, () => {
  it(`returns an empty object when there is no match path interpolation`, () => {
    expect(getMatchPath(`{Product.foo}/bar`)).not.toHaveProperty(`matchPath`)
  })

  it(`returns a match for segments`, () => {
    expect(getMatchPath(`baz/123/[bar]`).matchPath).toEqual(`baz/123/:bar`)
  })

  it(`returns a match for named splats`, () => {
    expect(getMatchPath(`baz/123/[...bar]`).matchPath).toEqual(`baz/123/*bar`)
  })

  it(`returns a match for splats`, () => {
    expect(getMatchPath(`baz/123/[...]`).matchPath).toEqual(`baz/123/*`)
  })

  it(`handles multiple matches`, () => {
    expect(getMatchPath(`/products/[id]/[...page]`).matchPath).toEqual(
      `/products/:id/*page`
    )
  })
})
