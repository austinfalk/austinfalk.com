import {
  Facebook01Icon,
  GithubIcon,
  InstagramIcon,
  Linkedin01Icon,
  NewTwitterIcon,
  TiktokIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { cn } from 'cn';
import { buttonVariants } from '@/components/ui/button';
import { type SocialKey, socials } from '@/data/site';

const icons: Partial<Record<SocialKey, IconSvgElement>> = {
  instagram: InstagramIcon,
  x: NewTwitterIcon,
  linkedin: Linkedin01Icon,
  tiktok: TiktokIcon,
  github: GithubIcon,
  facebook: Facebook01Icon,
};

/** Outbound profiles as a row of icons; profiles without an icon show their name. */
export function SocialLinks({ className }: { className?: string }) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-1', className)}>
      {socials.map((social) => {
        const icon = icons[social.key];
        return (
          <li key={social.key}>
            <a
              href={social.href}
              target="_blank"
              rel="me noopener noreferrer"
              aria-label={`${social.label}, opens in a new tab`}
              className={cn(
                buttonVariants({ variant: 'ghost', size: icon ? 'icon-lg' : 'lg' }),
                'text-foreground/80 hover:bg-transparent hover:text-primary focus-visible:ring-ring dark:hover:bg-transparent',
                !icon && 'px-3 text-base',
              )}
            >
              {icon ? (
                <HugeiconsIcon icon={icon} strokeWidth={1.5} className="size-[22px]" />
              ) : (
                social.label
              )}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
