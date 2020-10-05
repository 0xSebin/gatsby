# Experimental static images for Gatsby

The [gatsby-image](https://www.gatsbyjs.org/packages/gatsby-image/), component combined with the sharp plugin, as an awesome way to automatically resize and optimise your images and serve them on the most performant way. This plugin is a proof of concept for a simpler way to use Gatsby's image processing tools without needing to write GraphQL queries. It is designed for static images such as logos rather than ones loaded dynamically from a CMS.

The normal way to do this now is with `useStaticQuery`:

```js
import React from "react"
import Img from "gatsby-image"

export const Dino = () => {
  const data = useStaticQuery(graphql`
    query LogoQuery {
      file(relativePath: { eq: "trex.png" }) {
        childImageSharp {
          fixed(height: 100) {
            ...GatsbyImageSharpFixed
          }
        }
      }
    }
  `)

  return <Img fixed={data?.file?.childImageSharp?.fixed} alt="T-Rex" />
}
```

This component lets you write this instead:

```js
import React from "react"
import { StaticImage } from "gatsby-plugin-image"

export const Dino = () => (
  <StaticImage height={100} src="trex.png" alt="T-Rex" />
)
```

The `src` prop is relative to the source file, like in static HTML

You can pass in options that match ones passed to the `ImageSharp` query:

```js
import React from "react"
import { StaticImage } from "gatsby-plugin-image"

export const Dino = () => (
  <StaticImage
    src="trex.png"
    base64={false}
    fluid
    webP
    grayscale
    maxWidth={200}
    alt="T-Rex"
  />
)
```

...is equivalent to:

```js
import React from "react"
import Img from "gatsby-image"

export const Dino = () => {
  const data = useStaticQuery(graphql`
    query LogoQuery {
      file(relativePath: { eq: "trex.png" }) {
        childImageSharp {
          fluid(maxWidth: 200, grayscale: true) {
            ...GatsbyImageSharpFixed_withWebp_noBase64
          }
        }
      }
    }
  `)

  return <Img fixed={data?.file?.childImageSharp?.fixed} alt="T-Rex" />
}
```

## How does it work?

When your site is compiled, any references to StaticImage components are extracted, the images are resized by Sharp in a similar way to `gatsby-transformer-sharp`, and then the resulting sharp object is written to `.cache/caches/gatsby-plugin-image/`, with the filename generated as a hash of the normalized image props. Next, a Babel plugin finds any references to StaticImage, calculates the same hash, then adds a `require()` to that JSON file it as a new `parsedValues` prop. It then returns a GatsbyImage, passing the parsedValues as the fixed or fluid prop. Errors don't cause the build to fail, but instead are written to the component as an `__error` prop, which is then logged in develop.

### Are there restrictions to how this is used?

The props must be able to be statically-analyzed at build time. You can't pass them as props from outside the component, or use the results of function calls, for example.

```js
//Doesn't work
({ logo }) => <Img src={logo}>
```

...and nor does this:

```js
//Doesn't work
() => {
    const width = getTheWidthFromSomewhere();
    return <Img src="trex-png" width={width}>
}
```

You can use variables and expressions if they're in the scope of the file, e.g.:

```js
//OK
() => {
    const width = 300
    return <Img src="trex-png" width={width}>
}
```

```js
//Also OK

const width = 300

() => {
    const height = width * 16 / 9
    return <Img src="trex-png" width={width} height={height}>
}
```

## Installation

```bash
npm install gatsby@static-image gatsby-plugin-image@static-image
```

...then add it to your `gatsby-config.js`:

```js
module.exports = {
  //...
  plugins: [
    "gatsby-plugin-sharp",
    "gatsby-plugin-image",
    //...
  ],
}
```

### API

The only required prop is `src`. The default type is `fixed`.

For now:

```typescript
export interface ImageOptions {
  fixed?: boolean //Default true
  fluid?: boolean
  webP?: boolean
  base64?: boolean // Default true
  tracedSVG?: boolean
}

export interface SomeGatsbyImageProps {
  fadeIn?: boolean
  durationFadeIn?: number
  title?: string
  alt?: string
  className?: string | object
  critical?: boolean
  crossOrigin?: string | boolean
  style?: object
  imgStyle?: object
  placeholderStyle?: object
  placeholderClassName?: string
  backgroundColor?: string | boolean
  onLoad?: () => void
  onError?: (event: Event) => void
  onStartLoad?: (param: { wasCached: boolean }) => void
  Tag?: string
  itemProp?: string
  loading?: `auto` | `lazy` | `eager`
  draggable?: boolean
}

export interface CommonImageProps {
  quality?: number
  jpegQuality?: number
  pngQuality?: number
  webpQuality?: number
  grayscale?: boolean
  duotone?: false | { highlight: string; shadow: string }
  toFormat?: "NO_CHANGE" | "JPG" | "PNG" | "WEBP"
  cropFocus?:
    | "CENTER"
    | "NORTH"
    | "NORTHEAST"
    | "EAST"
    | "SOUTHEAST"
    | "SOUTH"
    | "SOUTHWEST"
    | "WEST"
    | "NORTHWEST"
    | "ENTROPY"
    | "ATTENTION"
  pngCompressionSpeed?: number
  rotate?: number
}

export interface FluidImageProps extends CommonImageProps {
  fluid?: true
  fixed?: false
  maxWidth?: number
  maxHeight?: number
  srcSetBreakpoints?: number[]
  fit?: number
  background?: number
}

export interface FixedImageProps extends CommonImageProps {
  fixed?: true
  fluid?: false
  width?: number
  height?: number
}

export type AllProps = ImageOptions &
  FluidImageProps &
  FixedImageProps &
  SomeGatsbyImageProps & { src: string }
```
