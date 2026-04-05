import { type JSX } from 'react'
import { Button, Heading, Link } from '@andrilla/mado-ui/components'
import ArrowDown from '@andrilla/react-sf/arrow.down'
import ArrowUpForward from '@andrilla/react-sf/arrow.up.forward'
import { SFSymbolURLGenerator } from '../components/sf-symbol-url-generator.tsx'

export default function App(): JSX.Element {
	return (
		<main>
			<section className='max-w-8xl container mx-auto'>
				<Heading
					as='h1'
					className='text-primary-500 text-shadow-primary-500/25 pbe-4 text-shadow-lg'
				>
					SF Symbols Online
				</Heading>

				<p className='w-fit pbe-4 text-sm font-bold'>
					<Link href='#generator' lineType='fill-lift'>
						Skip to Generator
						<ArrowDown className='h-3' weight='bold' />
					</Link>
				</p>

				<p className='pbe-8'>
					This offers all exportable SF Symbols in all sizes and weights with
					image transformation and color choice.
				</p>

				<Heading className='text-primary-500 text-shadow-primary-500/25 text-shadow-md'>
					How to use
				</Heading>

				<p className='pbe-8'>
					Files are provided to the public at
					<Link href='#' lineType='static'>
						https://sf.andrilla.net/[symbol.name]
					</Link>
					. Use the same dot-syntax that Apple uses for SF Symbols.
				</p>

				<Heading
					as='h3'
					className='text-primary-500 text-shadow-primary-500/25 text-shadow-sm'
				>
					Options
				</Heading>

				<p className='pbe-4'>
					By default the small size, regular weight SVG data is provided. If
					this isn't what you need try these options with search params.
				</p>

				<p className='max-w-none pbe-4'>
					<strong className='text-primary-500 text-shadow-primary-500/25 text-shadow-xs'>
						Example:
					</strong>{' '}
					<Link
						href='https://sf.andrilla.net/hand.palm.facing?fm=png&w=256&size=large&weight=bold'
						className='text-smaller inline-flex'
						lineType='multiline-fill'
						target='_blank'
					>
						https://sf.andrilla.net/hand.palm.facing?fm=png&w=256&size=large&weight=bold
						<ArrowUpForward
							className='-top-1 -left-1 size-2 shrink-0'
							weight='semibold'
						/>
					</Link>
				</p>

				<ul className='ps-4 pbe-4 *:pbe-2 *:last:pbe-0' role='list'>
					<li>
						<strong>bg</strong>: Set the background hex value{' '}
						<small>(exclude #)</small>.
					</li>

					<li>
						<strong>fill</strong>: Set the fill hex value{' '}
						<small>(exclude #)</small>.
					</li>

					<li>
						<strong>fm</strong>: Select the image format.
						<ul
							className='list-inside list-disc py-2 ps-4 *:pbe-2 *:last:pbe-0'
							role='list'
						>
							<li>
								svg <small>(default)</small>
							</li>

							<li>png</li>

							<li>webp</li>

							<li>jpg</li>
						</ul>
					</li>

					<li>
						<strong>h</strong>: Set the pixel height <small>(number)</small>.
					</li>

					<li>
						<strong>p</strong>: Set the padding pixel value{' '}
						<small>(number)</small>.
					</li>

					<li>
						<strong>size</strong>: Select the SF Symbol size.
						<ul
							className='list-inside list-disc py-2 ps-4 *:pbe-2 *:last:pbe-0'
							role='list'
						>
							<li>
								small <small>(default)</small>
							</li>

							<li>medium</li>

							<li>large</li>
						</ul>
					</li>

					<li>
						<strong>stroke</strong>: Set the stroke hex value{' '}
						<small>(exclude #)</small>.
					</li>

					<li>
						<strong>stroke-w</strong>: Set the stroke-width value{' '}
						<small>(number)</small>.
					</li>

					<li>
						<strong>w</strong>: Set the pixel width <small>(number)</small>.
					</li>

					<li>
						<strong>weight</strong>: Select the SF Symbol weight.
						<ul
							className='list-inside list-disc py-2 ps-4 *:pbe-2 *:last:pbe-0'
							role='list'
						>
							<li>ultralight</li>

							<li>thin</li>

							<li>light</li>

							<li>
								regular <small>(default)</small>
							</li>

							<li>medium</li>

							<li>semibold</li>

							<li>bold</li>

							<li>heavy</li>

							<li>black</li>
						</ul>
					</li>
				</ul>

				<p>
					Generally, it's best to choose to set either the width or height and
					not both, depending on which is larger for the symbol you're using.
				</p>
			</section>

			<section className='max-w-8xl container mx-auto'>
				<div className='shadow-primary-500/50 text-primary-50 standalone-text-t-container from-primary-700 via-primary-500 to-primary-300 rounded-3xl bg-linear-to-tr shadow-2xl sm:rounded-[4rem]'>
					<div className='pbe-8'>
						<Heading className='text-shadow-primary-50/25 text-shadow-md'>
							Generator
						</Heading>

						<p className='pbe-4'>
							Generate the URL you're looking for{' '}
							<small>
								(you still have to know the name of the symbol you want to use)
							</small>
							.
						</p>

						<Button
							href='https://developer.apple.com/sf-symbols/'
							className='shadow-primary-50/25 border text-sm shadow-md'
							padding='sm'
						>
							Download SF Symbols
							<ArrowUpForward className='size-2.5' weight='medium' />
						</Button>
					</div>

					<SFSymbolURLGenerator />
				</div>
			</section>
		</main>
	)
}
